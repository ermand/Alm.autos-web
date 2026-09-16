/**
 * Turns the legacy JPEGs into responsive WebP variants in the upload directory.
 *
 * The old site shipped ~5 MB of full-size camera JPEGs straight to phones. Each
 * photo becomes three widths of WebP with EXIF stripped, named after the
 * vehicle slug.
 *
 * Writes into UPLOADS_DIR alongside whatever the client has uploaded, so it
 * overwrites by name and never clears the directory. Run once when setting a
 * environment up; re-running is harmless.
 */

import { mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { VARIANT_WIDTHS } from "../src/domain/photos.ts";
import { uploadsDir } from "../src/server/media.ts";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_DIR = resolve(ROOT, "legacy");

interface SeedRow {
  slug: string;
  photos: string[];
}

const seed = (await Bun.file(resolve(ROOT, "src/data/fleet.seed.json")).json()) as SeedRow[];
const outDir = uploadsDir();
await mkdir(outDir, { recursive: true });

const available = new Set(await readdir(SOURCE_DIR));
let written = 0;
const missing: string[] = [];

for (const vehicle of seed) {
  for (const [index, source] of vehicle.photos.entries()) {
    if (!available.has(source)) {
      missing.push(`${vehicle.slug}: ${source}`);
      continue;
    }

    const basename = `${vehicle.slug}-${index + 1}`;
    const pipeline = sharp(resolve(SOURCE_DIR, source)).rotate();

    for (const width of VARIANT_WIDTHS) {
      await pipeline
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(resolve(outDir, `${basename}-${width}.webp`));
      written++;
    }
  }
}

process.stdout.write(`${written} variants -> ${outDir}\n`);
if (missing.length > 0) {
  process.stdout.write(`missing sources:\n${missing.map((m) => `  ${m}`).join("\n")}\n`);
  process.exitCode = 1;
}
