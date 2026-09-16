/**
 * Writes public/sitemap.xml and public/robots.txt from the fleet.
 *
 * Static generation is right while the fleet comes from the committed seed. Once
 * the CMS can publish a vehicle, this must run on publish (or become a server
 * route) or the sitemap will go stale — see docs/PLAN.md, phase 2.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { LOCALES } from "../src/i18n/messages.ts";

const ROOT = resolve(import.meta.dirname, "..");
const ORIGIN = (process.env.SITE_URL ?? "https://alm.autos").replace(/\/$/, "");
const STATIC_PAGES = ["", "cars", "about", "contact", "privacy"];

interface SeedRow {
  slug: string;
}

function urlEntry(path: string, alternates: { locale: string; href: string }[]): string {
  const links = alternates
    .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.locale}" href="${alt.href}"/>`)
    .join("\n");
  return `  <url>\n    <loc>${ORIGIN}${path}</loc>\n${links}\n  </url>`;
}

const seed = (await Bun.file(resolve(ROOT, "src/data/fleet.seed.json")).json()) as SeedRow[];
const paths = [...STATIC_PAGES, ...seed.map((vehicle) => `cars/${vehicle.slug}`)];

const entries = paths.flatMap((page) => {
  const alternates: { locale: string; href: string }[] = LOCALES.map((locale) => ({
    locale: locale as string,
    href: `${ORIGIN}/${locale}${page ? `/${page}` : ""}`,
  }));
  // x-default points at English: the visitor with no Albanian preference is the
  // customer this business is trying to reach.
  alternates.push({ locale: "x-default", href: `${ORIGIN}/en${page ? `/${page}` : ""}` });

  return LOCALES.map((locale) => urlEntry(`/${locale}${page ? `/${page}` : ""}`, alternates));
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;

await mkdir(resolve(ROOT, "public"), { recursive: true });
await writeFile(resolve(ROOT, "public/sitemap.xml"), sitemap);
await writeFile(
  resolve(ROOT, "public/robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
);

process.stdout.write(`${entries.length} urls -> public/sitemap.xml, public/robots.txt\n`);
