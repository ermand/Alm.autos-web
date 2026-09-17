import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { isSafeVariantFilename, VARIANT_WIDTHS } from "~/domain/photos.ts";
import { config } from "./config.ts";

/**
 * Photo storage.
 *
 * Everything lives in one directory outside the app, because Forge's
 * zero-downtime deploys rotate `releases/` and anything written inside it is
 * deleted by the next deploy — including every photo the client has uploaded.
 * See docs/adr/0002.
 */

export function uploadsDir(): string {
  return config().UPLOADS_DIR;
}

export async function readVariant(filename: string): Promise<Buffer | null> {
  if (!isSafeVariantFilename(filename)) return null;
  try {
    return await readFile(resolve(uploadsDir(), filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED_INPUT = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export function isAcceptedUpload(type: string): boolean {
  return ACCEPTED_INPUT.has(type);
}

/**
 * Writes the three responsive variants of one photo and returns the basename
 * they share. EXIF is dropped by sharp, after honouring orientation — phone
 * photos arrive rotated and carrying GPS coordinates.
 */
export async function storePhoto(basename: string, input: ArrayBuffer): Promise<string> {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  const pipeline = sharp(Buffer.from(input)).rotate();

  for (const width of VARIANT_WIDTHS) {
    await pipeline
      .clone()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(resolve(dir, `${basename}-${width}.webp`));
  }

  return basename;
}

export async function deletePhoto(basename: string): Promise<void> {
  const dir = uploadsDir();
  await Promise.all(
    VARIANT_WIDTHS.map(async (width) => {
      try {
        await unlink(resolve(dir, `${basename}-${width}.webp`));
      } catch (error) {
        // A missing file is the desired end state; anything else is real.
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }),
  );
}

/**
 * The next free photo basename for a vehicle. Numbering never reuses a slot, so
 * a re-uploaded photo cannot collide with a cached URL of the deleted one.
 */
export async function nextPhotoBasename(slug: string): Promise<string> {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  const existing = await readdir(dir);
  const prefix = `${slug}-`;
  let highest = 0;

  for (const name of existing) {
    if (!name.startsWith(prefix)) continue;
    const index = Number(name.slice(prefix.length).split("-")[0]);
    if (Number.isFinite(index) && index > highest) highest = index;
  }

  return `${slug}-${highest + 1}`;
}

/** Used by the seed import, which reads already-encoded files from disk. */
export async function writeVariantFile(filename: string, bytes: Buffer): Promise<void> {
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, filename), bytes);
}
