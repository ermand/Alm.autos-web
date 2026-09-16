import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const origin = (process.env.SITE_URL ?? "https://alm.autos").replace(/\/$/, "");
        // The admin is behind a password, but there is no reason to invite crawlers.
        const body = `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`;
        return new Response(body, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
