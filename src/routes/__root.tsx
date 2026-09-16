import {
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALES } from "~/i18n/messages.ts";
import { localePath, stripLocalePrefix } from "~/i18n/paths.ts";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#c92c2e" },
      { title: "ALM Autos — Rent a car in Tirana" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // The client's own mark, cut out of legacy/Logo1.jpeg by
      // scripts/build-logo.ts. At tab size it reads as a red hexagon, which is
      // exactly how the company is recognised.
      { rel: "icon", href: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/brand/apple-touch-icon.png", sizes: "180x180" },
      // Fonts are self-hosted (src/styles/fonts.css). No third-party request is
      // made on any page, which is what the privacy page promises.
      {
        rel: "preload",
        href: "/fonts/inter-latin.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  // The document language follows the URL prefix, which is what screen readers
  // and Google both read.
  const params = useParams({ strict: false }) as { lang?: string };
  const lang = params.lang && isLocale(params.lang) ? params.lang : DEFAULT_LOCALE;

  // hreflang and canonical belong here rather than on the /$lang layout: a
  // layout match only knows its own segment ("/en"), which would canonicalise
  // every page to the homepage.
  const { pathname } = useLocation();
  const origin = import.meta.env.VITE_SITE_URL ?? "https://alm.autos";
  const rest = stripLocalePrefix(pathname);

  return (
    <html lang={lang}>
      <head>
        <HeadContent />
        {LOCALES.map((locale) => (
          <link
            key={locale}
            rel="alternate"
            hrefLang={locale}
            href={`${origin}${localePath(locale, rest)}`}
          />
        ))}
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${origin}${localePath(DEFAULT_LOCALE, rest)}`}
        />
        <link rel="canonical" href={`${origin}${pathname}`} />
        <UmamiScript />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Self-hosted Umami, or nothing at all.
 *
 * Both values must be set, and the script must be served from our own domain:
 * the privacy page promises no third-party request on any page and no cookie
 * banner, and a hosted analytics script would break both. Umami is cookieless
 * and stores no personal data, which is what makes the promise keepable.
 *
 * The admin is excluded — counting the owner's own visits would only distort
 * what the fleet pages are actually doing.
 */
function UmamiScript() {
  const { pathname } = useLocation();
  const src = import.meta.env.VITE_UMAMI_SRC;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

  if (!src || !websiteId || pathname.startsWith("/admin")) return null;
  if (!src.startsWith("/")) {
    // A remote origin here would silently reintroduce third-party tracking.
    throw new Error("VITE_UMAMI_SRC must be a same-origin path, e.g. /stats/script.js");
  }

  return <script defer src={src} data-website-id={websiteId} />;
}
