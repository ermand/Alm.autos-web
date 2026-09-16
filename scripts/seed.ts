/**
 * Loads the committed fleet seed into Postgres.
 *
 * Idempotent: a Vehicle is matched by slug, so re-running updates rather than
 * duplicating. It never touches a Vehicle's prices or specs once the row exists
 * — after the CMS is live the owner's edits are the truth, and a redeploy must
 * not quietly overwrite them.
 */

import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { vehiclePhotos, vehicles } from "~/db/schema.ts";
import type { BaseRates } from "~/domain/pricing.ts";
import type { BodyType, Fuel, Transmission } from "~/domain/vehicle.ts";
import { getDb, hasDatabase } from "~/server/db.ts";

interface SeedRow {
  slug: string;
  model: string;
  year: number;
  transmission: Transmission | null;
  seats: number | null;
  fuel: Fuel | null;
  bodyType: BodyType | null;
  baseRates: BaseRates;
  photos: string[];
}

if (!hasDatabase()) {
  throw new Error("DATABASE_URL is not set; nothing to seed into.");
}

const ROOT = resolve(import.meta.dirname, "..");
const rows = (await Bun.file(resolve(ROOT, "src/data/fleet.seed.json")).json()) as SeedRow[];
const db = getDb();

let inserted = 0;
let skipped = 0;

for (const [index, row] of rows.entries()) {
  const [existing] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.slug, row.slug))
    .limit(1);

  if (existing) {
    skipped++;
    continue;
  }

  const [created] = await db
    .insert(vehicles)
    .values({
      slug: row.slug,
      model: row.model,
      year: row.year,
      transmission: row.transmission,
      fuel: row.fuel,
      bodyType: row.bodyType,
      seats: row.seats,
      baseRates: row.baseRates,
      sortOrder: index,
    })
    .returning({ id: vehicles.id });

  if (!created) throw new Error(`Insert returned no row for ${row.slug}.`);

  // The published variants are named after the slug by process-images.ts.
  await db.insert(vehiclePhotos).values(
    row.photos.map((_source, position) => ({
      vehicleId: created.id,
      path: `${row.slug}-${position + 1}`,
      position,
    })),
  );

  inserted++;
}

process.stdout.write(`seeded ${inserted} vehicles, left ${skipped} existing untouched\n`);
process.exit(0);
