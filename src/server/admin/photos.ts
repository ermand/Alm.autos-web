import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { vehiclePhotos, vehicles } from "~/db/schema.ts";
import { getDb } from "~/server/db.ts";
import {
  deletePhoto,
  isAcceptedUpload,
  MAX_UPLOAD_BYTES,
  nextPhotoBasename,
  storePhoto,
} from "~/server/media.ts";
import { requireAdmin } from "./guard.ts";

/**
 * Photo upload.
 *
 * Takes raw FormData so the client can send a File straight from a phone's
 * camera roll. The file is re-encoded to WebP at three widths, which drops the
 * EXIF block — phone photos carry GPS coordinates, and the client will not
 * think to strip them.
 */
export const uploadVehiclePhoto = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Expected a file upload.");

    const vehicleId = data.get("vehicleId");
    const file = data.get("file");

    if (typeof vehicleId !== "string" || !z.uuid().safeParse(vehicleId).success) {
      throw new Error("Missing car.");
    }
    if (!(file instanceof File)) throw new Error("No file was attached.");
    if (file.size === 0) throw new Error("That file is empty.");
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        `That photo is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
      );
    }
    if (!isAcceptedUpload(file.type)) {
      throw new Error("Only JPEG, PNG, WebP and AVIF photos can be uploaded.");
    }

    return { vehicleId, file };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    const [vehicle] = await db
      .select({ slug: vehicles.slug })
      .from(vehicles)
      .where(eq(vehicles.id, data.vehicleId))
      .limit(1);

    if (!vehicle) throw new Error("That car no longer exists.");

    const basename = await nextPhotoBasename(vehicle.slug);
    await storePhoto(basename, await data.file.arrayBuffer());

    const existing = await db
      .select({ position: vehiclePhotos.position })
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, data.vehicleId));

    const nextPosition = existing.reduce((max, row) => Math.max(max, row.position + 1), 0);

    const [created] = await db
      .insert(vehiclePhotos)
      .values({ vehicleId: data.vehicleId, path: basename, position: nextPosition })
      .returning({ id: vehiclePhotos.id });

    if (!created) throw new Error("The photo could not be saved.");
    return { id: created.id, path: basename, position: nextPosition };
  });

export const deleteVehiclePhoto = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    const [photo] = await db
      .select()
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.id, data.id))
      .limit(1);

    if (!photo) return { ok: true as const };

    await db.delete(vehiclePhotos).where(eq(vehiclePhotos.id, data.id));
    await deletePhoto(photo.path);

    // Close the gap so positions stay contiguous and the first photo is always
    // the card image.
    const remaining = await db
      .select({ id: vehiclePhotos.id })
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, photo.vehicleId))
      .orderBy(asc(vehiclePhotos.position));

    for (const [index, row] of remaining.entries()) {
      await db.update(vehiclePhotos).set({ position: index }).where(eq(vehiclePhotos.id, row.id));
    }

    return { ok: true as const };
  });

export const reorderVehiclePhotos = createServerFn({ method: "POST" })
  .validator(z.object({ ids: z.array(z.uuid()).min(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    for (const [index, id] of data.ids.entries()) {
      await db.update(vehiclePhotos).set({ position: index }).where(eq(vehiclePhotos.id, id));
    }

    return { ok: true as const };
  });
