/**
 * Turns the legacy JPEGs into responsive WebP variants.
 *
 * The old site shipped ~5 MB of full-size camera JPEGs straight to phones. Each
 * photo becomes three widths of WebP with EXIF stripped, named after the
 * vehicle slug so the published filename survives re-uploads.
 *
 * Runs in CI, not on the box — see docs/adr/0002 on build memory.
 */

import { mkdir, readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_DIR = resolve(ROOT, "legacy");
const OUT_DIR = resolve(ROOT, "public/vehicles");

export const VARIANT_WIDTHS = [400, 800, 1600] as const;

interface SeedRow {
  slug: string;
  photos: string[];
}

async function main() {
  const seed = (await Bun.file(resolve(ROOT, "src/data/fleet.seed.json")).json()) as SeedRow[];

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

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
      const input = resolve(SOURCE_DIR, source);

      for (const width of VARIANT_WIDTHS) {
        await sharp(input)
          .rotate() // honour EXIF orientation before stripping it
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toFile(resolve(OUT_DIR, `${basename}-${width}.webp`));
        written++;
      }
    }
  }

  process.stdout.write(`${written} variants -> public/vehicles\n`);
  if (missing.length > 0) {
    process.stdout.write(`missing sources:\n${missing.map((m) => `  ${m}`).join("\n")}\n`);
    process.exitCode = 1;
  }
}

await main();
