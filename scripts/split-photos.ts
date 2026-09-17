/**
 * Splits the client's collage photos into individual pictures.
 *
 * Every photo in legacy/ is a stitched contact sheet — typically a dashboard
 * strip across the top with two exterior shots beneath, sometimes a 2x2 grid,
 * sometimes a single clean shot. Shown at card size they read as a cramped grid
 * rather than a car, which is the main reason the site looks poor.
 *
 * Panels are found by looking for rows and columns where the image changes
 * abruptly: a seam between two stitched photos is a discontinuity far larger
 * than anything inside a real photograph. Exterior shots are emitted first,
 * because the card shows the first photo and nobody picks a rental car by its
 * dashboard.
 *
 * Writes a contact sheet to /tmp so the split can be eyeballed before trusting.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE_DIR = resolve(ROOT, "legacy");

export interface Panel {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Positions where the image changes abruptly, i.e. candidate seams. */
function discontinuities(lineMeans: number[], span: number, minEdge: number): number[] {
  const diffs = lineMeans.slice(1).map((v, i) => Math.abs(v - (lineMeans[i] as number)));
  const sorted = [...diffs].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  // A seam is far sharper than ordinary texture. 6x the median is conservative
  // enough that a busy photograph does not trip it.
  const threshold = Math.max(median * 6, 12);

  const found: number[] = [];
  for (let i = 0; i < diffs.length; i++) {
    const at = i + 1;
    if (at < minEdge || at > span - minEdge) continue;
    if ((diffs[i] as number) < threshold) continue;
    // Keep only the strongest point in a neighbourhood.
    const near = found.find((f) => Math.abs(f - at) < span * 0.08);
    if (near !== undefined) continue;
    found.push(at);
  }
  return found.sort((a, b) => a - b);
}

async function lineStats(image: ReturnType<typeof sharp>, width: number, height: number) {
  const { data } = await image.clone().greyscale().raw().toBuffer({ resolveWithObject: true });
  const rowMeans: number[] = [];
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) sum += data[y * width + x] as number;
    rowMeans.push(sum / width);
  }
  const colMeans: number[] = [];
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y < height; y++) sum += data[y * width + x] as number;
    colMeans.push(sum / height);
  }
  return { rowMeans, colMeans };
}

/** Panels of one collage, in reading order. */
export async function findPanels(file: string): Promise<Panel[]> {
  const image = sharp(file);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return [];

  const { rowMeans, colMeans } = await lineStats(image, width, height);

  // At most one horizontal band split: these sheets are a strip over a row.
  const hCuts = discontinuities(rowMeans, height, Math.round(height * 0.18)).slice(0, 1);
  const bands: Array<[number, number]> = [];
  let prev = 0;
  for (const cut of hCuts) {
    bands.push([prev, cut]);
    prev = cut;
  }
  bands.push([prev, height]);

  const panels: Panel[] = [];
  for (const [top, bottom] of bands) {
    const bandHeight = bottom - top;
    if (bandHeight < height * 0.12) continue;

    // Re-measure columns inside the band; a seam in the lower row does not
    // necessarily run through the strip above it.
    const band = sharp(file).extract({ left: 0, top, width, height: bandHeight });
    const { colMeans: bandCols } = await lineStats(band, width, bandHeight);
    const vCuts = discontinuities(bandCols, width, Math.round(width * 0.18)).slice(0, 2);

    let left = 0;
    for (const cut of [...vCuts, width]) {
      const panelWidth = cut - left;
      if (panelWidth >= width * 0.15) {
        panels.push({ left, top, width: panelWidth, height: bandHeight });
      }
      left = cut;
    }
  }

  void colMeans;
  return panels.length > 0 ? panels : [{ left: 0, top: 0, width, height }];
}

/**
 * A dashboard shot is shot from inside, so it is dominated by dark trim and has
 * no sky. Exterior shots almost always carry a bright band along the top.
 */
async function looksInterior(file: string, panel: Panel): Promise<boolean> {
  const strip = await sharp(file)
    .extract({
      left: panel.left,
      top: panel.top,
      width: panel.width,
      height: Math.max(1, Math.round(panel.height * 0.25)),
    })
    .greyscale()
    .stats();

  const topBrightness = strip.channels[0]?.mean ?? 0;
  const whole = await sharp(file).extract(panel).greyscale().stats();
  const overall = whole.channels[0]?.mean ?? 0;

  // Outside, the top quarter (sky, bright wall) is clearly lighter than the
  // frame as a whole. Inside a car it is not.
  return topBrightness < overall + 8;
}

export async function orderedPanels(file: string): Promise<Panel[]> {
  const panels = await findPanels(file);
  if (panels.length <= 1) return panels;

  const scored = [] as Array<{ panel: Panel; interior: boolean; area: number }>;
  for (const panel of panels) {
    scored.push({
      panel,
      interior: await looksInterior(file, panel),
      area: panel.width * panel.height,
    });
  }

  // Exteriors first, largest first within each group.
  scored.sort((a, b) => {
    if (a.interior !== b.interior) return a.interior ? 1 : -1;
    return b.area - a.area;
  });
  return scored.map((s) => s.panel);
}

if (import.meta.main) {
  const { readdirSync } = await import("node:fs");
  const files = readdirSync(SOURCE_DIR)
    .filter((f) => /^qera\d+\.jpeg$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));

  await mkdir("/tmp/panels", { recursive: true });
  const rows: string[] = [];
  let total = 0;

  for (const f of files) {
    const path = resolve(SOURCE_DIR, f);
    const panels = await orderedPanels(path);
    total += panels.length;
    rows.push(`${f}: ${panels.length} panel(s)`);

    for (const [i, panel] of panels.entries()) {
      await sharp(path)
        .extract(panel)
        .resize({ width: 300, height: 220, fit: "cover" })
        .jpeg()
        .toFile(`/tmp/panels/${f.replace(".jpeg", "")}-${i + 1}.jpg`);
    }
  }

  await writeFile("/tmp/panels/report.txt", rows.join("\n"));
  process.stdout.write(`${files.length} collages -> ${total} panels\n${rows.join("\n")}\n`);
}
