import { createFileRoute } from "@tanstack/react-router";
import { LOCALES } from "~/i18n/messages.ts";
import { listPublishedVehicles } from "~/server/fleet.ts";

/**
 * Generated per request from the published fleet.
 *
 * It used to be a file written at build time, which was correct only while the
 * fleet came from the committed seed — the moment the CMS can publish a
 * vehicle, a build-time sitemap is stale.
 */
const STATIC_PAGES = ["", "cars", "about", "contact", "privacy"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = (process.env.SITE_URL ?? "https://alm.autos").replace(/\/$/, "");
        const vehicles = await listPublishedVehicles();
        const pages = [...STATIC_PAGES, ...vehicles.map((vehicle) => `cars/${vehicle.slug}`)];

        const entries = pages.flatMap((page) => {
          const suffix = page ? `/${page}` : "";
          const alternates = [
            ...LOCALES.map((locale) => ({
              hreflang: locale,
              href: `${origin}/${locale}${suffix}`,
            })),
            { hreflang: "x-default", href: `${origin}/en${suffix}` },
          ];
          const links = alternates
            .map(
              (alt) =>
                `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}"/>`,
            )
            .join("\n");

          return LOCALES.map(
            (locale) => `  <url>\n    <loc>${origin}/${locale}${suffix}</loc>\n${links}\n  </url>`,
          );
        });

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
