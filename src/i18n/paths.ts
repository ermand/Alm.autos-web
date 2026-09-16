import type { Locale } from "./messages.ts";

/**
 * Both locales carry an explicit prefix. A shared link stays in the language it
 * was shared in, and hreflang pairs come out clean.
 */
export function localePath(locale: Locale, path = ""): string {
  const suffix = path.replace(/^\//, "");
  return suffix ? `/${locale}/${suffix}` : `/${locale}`;
}

export function vehiclePath(locale: Locale, slug: string): string {
  return localePath(locale, `cars/${slug}`);
}
