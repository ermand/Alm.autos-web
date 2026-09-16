import { asc } from "drizzle-orm";
import { seasons } from "~/db/schema.ts";
import type { Season } from "~/domain/pricing.ts";
import { getDb, hasDatabase } from "./db.ts";

/**
 * Seasons are fleet-wide and recur annually. Until the CMS exists the fleet runs
 * on the base rate alone: quoting a surcharge the owner has not confirmed would
 * be worse than quoting none.
 */
export async function listSeasons(): Promise<Season[]> {
  if (!hasDatabase()) return [];

  const rows = await getDb().select().from(seasons).orderBy(asc(seasons.position));
  return rows.map((row) => ({
    name: row.name,
    from: { month: row.fromMonth, day: row.fromDay },
    to: { month: row.toMonth, day: row.toDay },
    multiplier: row.multiplier,
  }));
}
