import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { siteSettings } from "~/db/schema.ts";
import { DEFAULT_SETTINGS } from "~/domain/contact.ts";
import { getDb } from "~/server/db.ts";
import { getSiteSettings } from "~/server/settings.ts";
import { requireAdmin } from "./guard.ts";

/**
 * Contact details, the one thing that changes without warning and breaks the
 * business when stale. Page prose deliberately stays in code.
 */
export const settingsInputSchema = z.object({
  phone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  email: z.string().trim().max(255),
  addressLine: z.string().trim().max(200),
  city: z.string().trim().max(120),
  instagram: z.string().trim().max(300),
  facebook: z.string().trim().max(300),
  mapsQuery: z.string().trim().max(300),
  hours: z.string().trim().max(300),
});

export const fetchSettingsForEdit = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return getSiteSettings();
});

export const saveSettings = createServerFn({ method: "POST" })
  .validator(settingsInputSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    // Upsert each key. Only keys the code knows about are written, so a stale
    // row cannot smuggle in a setting the app never reads.
    for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]) {
      const value = data[key];
      await db
        .insert(siteSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value } });
    }

    return { ok: true as const };
  });
