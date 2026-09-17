/**
 * Turns the client's collage photos into individual, usable pictures.
 *
 * Every source photo is a stitched contact sheet: a dashboard strip across the
 * top with two or three exterior shots beneath. Shown at card size that reads
 * as a cramped grid rather than a car, which was the main reason the site
 * looked poor no matter what the layout did.
 *
 * This splits each sheet into its panels (scripts/split-photos.ts finds the
 * seams), drops the dashboard strip from the front of the order, and writes
 * each panel as its own photo. One collage becomes three or four real pictures,
 * which is also what finally gives the vehicle gallery something to show.
 *
 * Writes a manifest so the seed knows how many photos each car ended up with.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { VARIANT_WIDTHS } from "../src/domain/photos.ts";
import { uploadsDir } from "../src/server/media.ts";
import { findPanels } from "./split-photos.ts";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_DIR = resolve(ROOT, "legacy");

/**
 * Panels chosen by eye where the automatic split picks badly — a wall, a
 * windscreen, or a seat. The number is the 1-based panel index to lead with.
 * `null` means the sheet resists splitting and is better left whole than
 * cropped to something meaningless.
 */
const LEAD_PANEL: Record<string, number | null> = {
  "qera8.jpeg": 4,
  "qera15.jpeg": 1,
  "qera16.jpeg": null,
  "qera17.jpeg": null,
  "qera18.jpeg": 1,
  "qera21.jpeg": 4,
};

interface SeedRow {
  slug: string;
  photos: string[];
}

/**
 * The client built every sheet the same way, so position identifies the
 * dashboard far more reliably than trying to recognise one: it is the top band.
 */
async function photosFor(source: string) {
  const path = resolve(SOURCE_DIR, source);
  const override = LEAD_PANEL[source];

  if (override === null) {
    return [{ whole: true as const, path }];
  }

  const panels = await findPanels(path);
  if (panels.length <= 1) return panels.map((panel) => ({ panel, path }));

  const bands = [...new Set(panels.map((p) => p.top))].sort((a, b) => a - b);
  const exterior = bands.length > 1 ? panels.filter((p) => p.top !== bands[0]) : panels;
  const interior = bands.length > 1 ? panels.filter((p) => p.top === bands[0]) : [];

  // Widest first: a full side-on shot beats a cropped corner.
  const ordered = [...exterior].sort((a, b) => b.width - a.width);

  if (override !== undefined) {
    const chosen = panels[override - 1];
    if (chosen) {
      const rest = panels.filter((p) => p !== chosen);
      return [chosen, ...rest].map((panel) => ({ panel, path }));
    }
  }

  return [...ordered, ...interior].map((panel) => ({ panel, path }));
}

const seed = (await Bun.file(resolve(ROOT, "src/data/fleet.seed.json")).json()) as SeedRow[];
const outDir = uploadsDir();
await mkdir(outDir, { recursive: true });

const manifest: Record<string, string[]> = {};
let written = 0;

for (const vehicle of seed) {
  const basenames: string[] = [];

  for (const source of vehicle.photos) {
    const pictures = await photosFor(source);

    for (const picture of pictures) {
      const basename = `${vehicle.slug}-${basenames.length + 1}`;
      basenames.push(basename);

      const base =
        "whole" in picture ? sharp(picture.path) : sharp(picture.path).extract(picture.panel);

      for (const width of VARIANT_WIDTHS) {
        await base
          .clone()
          .rotate()
          .resize(width, Math.round((width * 3) / 4), { fit: "cover", position: "centre" })
          .webp({ quality: 80 })
          .toFile(resolve(outDir, `${basename}-${width}.webp`));
        written++;
      }
    }
  }

  manifest[vehicle.slug] = basenames;
}

await writeFile(
  resolve(ROOT, "src/data/photo-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const counts = Object.values(manifest).map((p) => p.length);
process.stdout.write(
  `${written} variants -> ${outDir}\n` +
    `${counts.reduce((a, b) => a + b, 0)} photos across ${counts.length} cars ` +
    `(min ${Math.min(...counts)}, max ${Math.max(...counts)})\n`,
);
