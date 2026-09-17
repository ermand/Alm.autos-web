import { siteSettings } from "~/db/schema.ts";
import { DEFAULT_SETTINGS, type SiteSettings } from "~/domain/contact.ts";
import { getDb, hasDatabase } from "./db.ts";

/**
 * Reading the site settings. The shape, the defaults and the link helpers live
 * in ~/domain/contact.ts, which components import instead — this module touches
 * the database and must never reach the browser.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!hasDatabase()) return DEFAULT_SETTINGS;

  const rows = await getDb().select().from(siteSettings);
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...stored };
}
