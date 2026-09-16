import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { enquiries, vehicles } from "~/db/schema.ts";
import { LOCALES } from "~/i18n/messages.ts";
import { getDb, hasDatabase } from "./db.ts";
import { getSiteSettings } from "./settings.ts";

/**
 * An Enquiry reserves nothing (docs/adr/0001). It is stored so no lead is lost
 * when mail breaks, and emailed so the owner sees it without opening the admin.
 */

export const enquiryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(255),
  phone: z.string().trim().min(4).max(40),
  pickupDate: z.iso.date().nullable().default(null),
  dropoffDate: z.iso.date().nullable().default(null),
  message: z.string().trim().max(2000).nullable().default(null),
  vehicleSlug: z.string().max(120).nullable().default(null),
  locale: z.enum(LOCALES),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;

async function sendNotification(input: EnquiryInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_NOTIFY_EMAIL ?? (await getSiteSettings()).email;
  const from = process.env.ENQUIRY_FROM_EMAIL;

  if (!apiKey || !from) return;

  const lines = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    input.vehicleSlug ? `Car: ${input.vehicleSlug}` : null,
    input.pickupDate ? `Pick-up: ${input.pickupDate}` : null,
    input.dropoffDate ? `Drop-off: ${input.dropoffDate}` : null,
    input.message ? `\n${input.message}` : null,
  ].filter(Boolean);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: input.email,
      subject: `New enquiry — ${input.name}${input.vehicleSlug ? ` (${input.vehicleSlug})` : ""}`,
      text: lines.join("\n"),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Resend rejected the notification: ${response.status} ${await response.text()}`,
    );
  }
}

export const submitEnquiry = createServerFn({ method: "POST" })
  .validator(enquiryInputSchema)
  .handler(async ({ data }) => {
    const stored = hasDatabase();
    const notifiable = Boolean(process.env.RESEND_API_KEY && process.env.ENQUIRY_FROM_EMAIL);

    // Accepting a lead we can neither store nor send would lose it silently.
    if (!stored && !notifiable) {
      throw new Error(
        "Enquiries cannot be accepted: set DATABASE_URL, or RESEND_API_KEY and ENQUIRY_FROM_EMAIL.",
      );
    }

    if (stored) {
      const db = getDb();

      // An Enquiry is a request to rent a Vehicle (CONTEXT.md), so the record
      // has to say which one. An unknown slug stores a null rather than losing
      // the whole lead.
      let vehicleId: string | null = null;
      if (data.vehicleSlug) {
        const [match] = await db
          .select({ id: vehicles.id })
          .from(vehicles)
          .where(eq(vehicles.slug, data.vehicleSlug))
          .limit(1);
        vehicleId = match?.id ?? null;
      }

      await db.insert(enquiries).values({
        vehicleId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        pickupDate: data.pickupDate,
        dropoffDate: data.dropoffDate,
        message: data.message,
        locale: data.locale,
      });
    }

    // The lead is already safe in Postgres; a mail outage must not fail the
    // request, but it must not pass unnoticed either.
    if (notifiable) {
      if (stored) {
        await sendNotification(data).catch((error: unknown) => {
          console.error("Enquiry stored but notification failed", error);
        });
      } else {
        await sendNotification(data);
      }
    }

    return { ok: true as const };
  });
