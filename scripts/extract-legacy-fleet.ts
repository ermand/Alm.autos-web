/**
 * One-off: lift the fleet out of the old hand-written index.html into a seed file.
 *
 * The old markup carries only model, year, price and a single photo. Transmission
 * is recoverable from the model names ("Ford Focus Manual"), and "6+1" means seven
 * seats. Fuel and body type are not in there at all and are left absent on purpose
 * — see docs/PLAN.md. Run once; the output is committed and then hand-edited.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

/** Misspellings in the old site that cost search traffic. */
const MODEL_CORRECTIONS: Record<string, string> = {
  "Dacia Dyster": "Dacia Duster",
  "Suzuki Vitra 4x4": "Suzuki Vitara 4x4",
  "Skoda Oktavia": "Skoda Octavia",
  "Vw Golf 6 plus": "VW Golf 6 Plus",
  "Benz SLK": "Mercedes-Benz SLK",
};

type Transmission = "manual" | "automatic";

interface SeedVehicle {
  slug: string;
  model: string;
  year: number;
  transmission: Transmission | null;
  seats: number | null;
  fuel: null;
  bodyType: null;
  baseRates: Record<string, number>;
  photos: string[];
}

function parseBoxes(html: string) {
  const boxes = html.matchAll(
    /<div class="box">\s*<div class="box-img">\s*<img src="([^"]+)"[^>]*>\s*<\/div>\s*<p>(\d{4})<\/p>\s*<h3>([^<]+)<\/h3>\s*<h2>\s*€?\s*(\d+)\s*<span>/g,
  );
  return [...boxes].map((m) => ({
    photo: m[1] as string,
    year: Number(m[2]),
    rawName: (m[3] as string).trim(),
    pricePerDay: Number(m[4]),
  }));
}

function splitTransmission(name: string): { model: string; transmission: Transmission | null } {
  const match = name.match(/\s+(manual|automatic|automat)$/i);
  if (!match) return { model: name, transmission: null };
  const keyword = (match[1] as string).toLowerCase();
  return {
    model: name.slice(0, match.index).trim(),
    transmission: keyword === "manual" ? "manual" : "automatic",
  };
}

/** "VW Touran 6+1" is a seven-seater, not a model called "Touran 6+1". */
function splitSeats(name: string): { model: string; seats: number | null } {
  const match = name.match(/\s*(\d)\s*\+\s*1\s*/);
  if (!match) return { model: name, seats: null };
  return {
    model: name.replace(match[0], " ").replace(/\s+/g, " ").trim(),
    seats: Number(match[1]) + 1,
  };
}

function correct(model: string): string {
  for (const [wrong, right] of Object.entries(MODEL_CORRECTIONS)) {
    if (model.toLowerCase() === wrong.toLowerCase()) return right;
  }
  return model;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\+/g, "-plus-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The old site quoted exactly one number per car, and that is all we know.
 *
 * Every tier is seeded at that same price on purpose. Inventing a long-stay
 * discount here would put a price on the website that the owner never agreed to
 * — the "from" figure on a card is the cheapest tier, so a guessed ladder would
 * advertise a Q5 at €33.75 when he charges €45. The tier machinery is real and
 * tested; the owner enters the real discounts in the CMS.
 */
function flatRates(pricePerDay: number): Record<string, number> {
  const base = pricePerDay * 100;
  return { "1-3": base, "4-7": base, "8-29": base, "30+": base };
}

const html = await Bun.file(resolve(ROOT, "legacy/index.html")).text();
const parsed = parseBoxes(html);

const used = new Map<string, number>();
const vehicles: SeedVehicle[] = parsed.map((entry) => {
  const { model: withoutTransmission, transmission } = splitTransmission(entry.rawName);
  const { model: stripped, seats } = splitSeats(withoutTransmission);
  const model = correct(stripped);

  let slug = slugify(`${model}-${entry.year}`);
  const seen = used.get(slug) ?? 0;
  used.set(slug, seen + 1);
  if (seen > 0) slug = `${slug}-${seen + 1}`;

  return {
    slug,
    model,
    year: entry.year,
    transmission,
    seats,
    fuel: null,
    bodyType: null,
    baseRates: flatRates(entry.pricePerDay),
    photos: [entry.photo],
  };
});

await writeFile(
  resolve(ROOT, "src/data/fleet.seed.json"),
  `${JSON.stringify(vehicles, null, 2)}\n`,
);

const withTransmission = vehicles.filter((v) => v.transmission).length;
process.stdout.write(
  `${vehicles.length} vehicles -> src/data/fleet.seed.json\n` +
    `transmission known: ${withTransmission}/${vehicles.length}\n` +
    `seats known: ${vehicles.filter((v) => v.seats).length}/${vehicles.length}\n`,
);
for (const v of vehicles) {
  process.stdout.write(
    `  ${v.slug.padEnd(34)} ${String(v.year)}  ${(v.transmission ?? "-").padEnd(9)} €${(v.baseRates["1-3"] ?? 0) / 100}/day\n`,
  );
}
