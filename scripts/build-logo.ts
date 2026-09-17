/**
 * Turns the client's logo into usable web assets.
 *
 * legacy/Logo1.jpeg is a JPEG with a light grey backdrop baked in, so it cannot
 * sit on the site's sand background without showing a grey square. The mark has
 * a white outline whose value is close to that backdrop, so thresholding on
 * brightness would eat the outline. Instead this flood-fills inward from the
 * edges: only pixels connected to the border become transparent, and the white
 * outline and the white counters inside the letters survive.
 *
 * Run once; the output is committed. Replace it if the client ever supplies a
 * vector original, which would be better than any of this.
 */

import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = resolve(ROOT, "legacy/Logo1.jpeg");
const OUT_DIR = resolve(ROOT, "public/brand");

/**
 * How far a pixel may sit from the backdrop colour and still count as
 * background. The gap between the grey backdrop and the white outline is only
 * about 25 in RGB distance, so this has to stay well under that.
 */
const TOLERANCE = 16;

async function cutBackdrop(): Promise<Buffer> {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const at = (x: number, y: number) => (y * width + x) * channels;

  // The corner is background by definition.
  const bg = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
  const close = (i: number) => {
    const dr = (data[i] ?? 0) - (bg[0] ?? 0);
    const dg = (data[i + 1] ?? 0) - (bg[1] ?? 0);
    const db = (data[i + 2] ?? 0) - (bg[2] ?? 0);
    return Math.sqrt(dr * dr + dg * dg + db * db) <= TOLERANCE;
  };

  const seen = new Uint8Array(width * height);
  const queue: number[] = [];

  for (let x = 0; x < width; x++) {
    queue.push(x, 0, x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    queue.push(0, y, width - 1, y);
  }

  let cleared = 0;
  while (queue.length > 0) {
    const y = queue.pop() as number;
    const x = queue.pop() as number;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;

    const p = y * width + x;
    if (seen[p]) continue;

    const i = at(x, y);
    if (!close(i)) continue;

    seen[p] = 1;
    data[i + 3] = 0;
    cleared++;

    queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  process.stdout.write(`cleared ${cleared} background pixels of ${width * height}\n`);

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

const cut = await cutBackdrop();
await mkdir(OUT_DIR, { recursive: true });

// Trim the transparent margin so the mark fills its box and can be sized by CSS.
const trimmed = await sharp(cut).trim({ threshold: 1 }).png().toBuffer();
const meta = await sharp(trimmed).metadata();
process.stdout.write(`trimmed to ${meta.width}x${meta.height}\n`);

for (const size of [96, 192, 512]) {
  await sharp(trimmed)
    .resize({
      width: size,
      height: size,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT_DIR, `logo-${size}.png`));
}

// Favicons. A browser tab is 16-32px, where the mark reads as a red hexagon —
// which is the point: recognisable at a glance, and unmistakably this company.
for (const size of [32, 180]) {
  await sharp(trimmed)
    .resize({
      width: size,
      height: size,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT_DIR, size === 180 ? "apple-touch-icon.png" : "favicon-32.png"));
}

process.stdout.write(`wrote logo-96/192/512, favicon-32 and apple-touch-icon to public/brand\n`);
