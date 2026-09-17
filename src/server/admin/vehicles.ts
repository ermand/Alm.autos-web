import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { vehiclePhotos, vehicles } from "~/db/schema.ts";
import { type Vehicle, vehicleInputSchema } from "~/domain/vehicle.ts";
import { getDb } from "~/server/db.ts";
import { deletePhoto } from "~/server/media.ts";
import { requireAdmin } from "./guard.ts";

/** Admin reads the whole fleet, not just what is published. */
export const listAllVehicles = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = getDb();

  const rows = await db.select().from(vehicles).orderBy(asc(vehicles.sortOrder));
  const photos = await db.select().from(vehiclePhotos).orderBy(asc(vehiclePhotos.position));

  return rows.map((row) => ({
    ...row,
    photos: photos
      .filter((photo) => photo.vehicleId === row.id)
      .map((photo) => ({ id: photo.id, path: photo.path, position: photo.position })),
  })) satisfies Vehicle[];
});

export const getVehicleForEdit = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    const [row] = await db.select().from(vehicles).where(eq(vehicles.id, data.id)).limit(1);
    if (!row) return null;

    const photos = await db
      .select()
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, row.id))
      .orderBy(asc(vehiclePhotos.position));

    return {
      ...row,
      photos: photos.map((photo) => ({
        id: photo.id,
        path: photo.path,
        position: photo.position,
      })),
    };
  });

/**
 * A slug must be unique across the fleet, and is frozen once a vehicle has been
 * published — changing it would break the URL Google has already indexed.
 */
async function assertSlugAvailable(slug: string, excludeId?: string): Promise<void> {
  const db = getDb();
  const clash = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(
      excludeId
        ? and(eq(vehicles.slug, slug), ne(vehicles.id, excludeId))
        : eq(vehicles.slug, slug),
    )
    .limit(1);

  if (clash.length > 0) {
    throw new Error(`Another car already uses the address "${slug}".`);
  }
}

export const createVehicle = createServerFn({ method: "POST" })
  .validator(vehicleInputSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    await assertSlugAvailable(data.slug);

    const db = getDb();
    const [last] = await db
      .select({ sortOrder: vehicles.sortOrder })
      .from(vehicles)
      .orderBy(asc(vehicles.sortOrder))
      .limit(1);

    const [created] = await db
      .insert(vehicles)
      .values({ ...data, sortOrder: (last?.sortOrder ?? 0) + 1 })
      .returning({ id: vehicles.id });

    if (!created) throw new Error("The car could not be created.");
    return { id: created.id };
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), input: vehicleInputSchema }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    const [existing] = await db
      .select({ slug: vehicles.slug, status: vehicles.status })
      .from(vehicles)
      .where(eq(vehicles.id, data.id))
      .limit(1);

    if (!existing) throw new Error("That car no longer exists.");

    if (existing.slug !== data.input.slug) {
      if (existing.status === "published") {
        throw new Error(
          "The web address of a published car cannot change; search engines already point at it.",
        );
      }
      await assertSlugAvailable(data.input.slug, data.id);
    }

    await db
      .update(vehicles)
      .set({ ...data.input, updatedAt: new Date() })
      .where(eq(vehicles.id, data.id));

    return { ok: true as const };
  });

/**
 * Deletion removes the photo files too, which is the one irreversible part.
 * Retiring is the usual answer and the admin nudges towards it.
 */
export const deleteVehicle = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    const photos = await db
      .select({ path: vehiclePhotos.path })
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, data.id));

    await db.delete(vehicles).where(eq(vehicles.id, data.id));
    await Promise.all(photos.map((photo) => deletePhoto(photo.path)));

    return { ok: true as const };
  });

export const reorderVehicles = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(z.uuid()).min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    for (const [index, id] of data.ids.entries()) {
      await db.update(vehicles).set({ sortOrder: index }).where(eq(vehicles.id, id));
    }

    return { ok: true as const };
  });
