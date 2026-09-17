import { DEFAULT_LOCALE, LOCALES, type Locale } from "./messages.ts";

/**
 * Picks a locale from an Accept-Language header. Albanian only wins when the
 * visitor actually asks for it; everyone else gets English, because the paying
 * customer is usually a visitor to the country.
 */
export function negotiateLocale(header: string | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        tag: (tag ?? "").trim().toLowerCase(),
        quality: q ? Number.parseFloat(q.split("=")[1] ?? "0") : 1,
      };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (base && (LOCALES as readonly string[]).includes(base)) return base as Locale;
  }

  return DEFAULT_LOCALE;
}
