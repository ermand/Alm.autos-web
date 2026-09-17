import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { enquiries, vehicles } from "~/db/schema.ts";
import { getDb } from "~/server/db.ts";
import { requireAdmin } from "./guard.ts";

export const listEnquiries = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  return getDb()
    .select({
      id: enquiries.id,
      name: enquiries.name,
      email: enquiries.email,
      phone: enquiries.phone,
      pickupDate: enquiries.pickupDate,
      dropoffDate: enquiries.dropoffDate,
      message: enquiries.message,
      locale: enquiries.locale,
      handledAt: enquiries.handledAt,
      createdAt: enquiries.createdAt,
      vehicleModel: vehicles.model,
      vehicleYear: vehicles.year,
    })
    .from(enquiries)
    .leftJoin(vehicles, eq(vehicles.id, enquiries.vehicleId))
    .orderBy(desc(enquiries.createdAt))
    .limit(500);
});

export const setEnquiryHandled = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), handled: z.boolean() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb()
      .update(enquiries)
      .set({ handledAt: data.handled ? new Date() : null })
      .where(eq(enquiries.id, data.id));
    return { ok: true as const };
  });

export const deleteEnquiry = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb().delete(enquiries).where(eq(enquiries.id, data.id));
    return { ok: true as const };
  });

/** A leading =, +, - or @ makes a spreadsheet treat a cell as a formula. */
function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export const exportEnquiriesCsv = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();

  const rows = await getDb()
    .select({
      createdAt: enquiries.createdAt,
      name: enquiries.name,
      email: enquiries.email,
      phone: enquiries.phone,
      pickupDate: enquiries.pickupDate,
      dropoffDate: enquiries.dropoffDate,
      message: enquiries.message,
      locale: enquiries.locale,
      model: vehicles.model,
      year: vehicles.year,
    })
    .from(enquiries)
    .leftJoin(vehicles, eq(vehicles.id, enquiries.vehicleId))
    .orderBy(desc(enquiries.createdAt));

  const header = [
    "date",
    "name",
    "email",
    "phone",
    "pickup",
    "dropoff",
    "car",
    "language",
    "message",
  ];

  const lines = rows.map((row) =>
    [
      csvCell(row.createdAt.toISOString()),
      csvCell(row.name),
      csvCell(row.email),
      csvCell(row.phone),
      csvCell(row.pickupDate),
      csvCell(row.dropoffDate),
      csvCell(row.model ? `${row.model} (${row.year})` : null),
      csvCell(row.locale),
      csvCell(row.message),
    ].join(","),
  );

  // The BOM is what makes Excel read UTF-8, and Albanian needs ë and ç.
  return `﻿${[header.join(","), ...lines].join("\r\n")}\r\n`;
});
