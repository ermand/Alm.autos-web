import { asc, eq } from "drizzle-orm";
import seedFleet from "~/data/fleet.seed.json" with { type: "json" };
import { vehiclePhotos, vehicles } from "~/db/schema.ts";
import type { BaseRates } from "~/domain/pricing.ts";
import {
  type BodyType,
  compareVehicles,
  type Fuel,
  type Transmission,
  type Vehicle,
} from "~/domain/vehicle.ts";
import { getDb, hasDatabase } from "./db.ts";

/**
 * Reading the fleet.
 *
 * Phase 1 ships before the CMS exists, so when no DATABASE_URL is configured
 * this falls back to the seed lifted out of the old hand-written site. The
 * fallback is for local development and the pre-CMS launch only — production
 * sets DATABASE_URL and takes the Postgres path. See docs/PLAN.md.
 */

interface SeedRow {
  slug: string;
  model: string;
  year: number;
  transmission: string | null;
  seats: number | null;
  fuel: string | null;
  bodyType: string | null;
  baseRates: Record<string, number>;
  photos: string[];
}

function fromSeed(row: SeedRow, index: number): Vehicle {
  return {
    id: row.slug,
    slug: row.slug,
    model: row.model,
    year: row.year,
    transmission: row.transmission as Transmission | null,
    fuel: row.fuel as Fuel | null,
    bodyType: row.bodyType as BodyType | null,
    seats: row.seats,
    doors: null,
    airConditioning: null,
    descriptionEn: null,
    descriptionSq: null,
    status: "published",
    featured: false,
    sortOrder: index,
    baseRates: row.baseRates as unknown as BaseRates,
    // The seed still names the old files (qera1.jpeg); the published variants are
    // named after the slug by scripts/process-images.ts.
    photos: row.photos.map((_source, position) => ({
      id: `${row.slug}-${position}`,
      path: `${row.slug}-${position + 1}`,
      position,
    })),
  };
}

function seededFleet(): Vehicle[] {
  return (seedFleet as SeedRow[]).map(fromSeed);
}

export async function listPublishedVehicles(): Promise<Vehicle[]> {
  if (!hasDatabase()) return seededFleet().sort(compareVehicles);

  const db = getDb();
  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.status, "published"))
    .orderBy(asc(vehicles.sortOrder));

  const photos = await db.select().from(vehiclePhotos).orderBy(asc(vehiclePhotos.position));
  const byVehicle = new Map<string, typeof photos>();
  for (const photo of photos) {
    const list = byVehicle.get(photo.vehicleId) ?? [];
    list.push(photo);
    byVehicle.set(photo.vehicleId, list);
  }

  return rows
    .map((row) => ({
      ...row,
      photos: (byVehicle.get(row.id) ?? []).map((photo) => ({
        id: photo.id,
        path: photo.path,
        position: photo.position,
      })),
    }))
    .sort(compareVehicles);
}

export async function getPublishedVehicle(slug: string): Promise<Vehicle | undefined> {
  const fleet = await listPublishedVehicles();
  return fleet.find((vehicle) => vehicle.slug === slug);
}
