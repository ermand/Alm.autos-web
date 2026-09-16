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
      { name: "theme-color", content: "#6b1122" },
      { title: "ALM Autos — Rent a car in Tirana" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-maroon-700 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
