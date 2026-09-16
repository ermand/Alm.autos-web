import type { Locale } from "~/i18n/messages.ts";

const INTL_LOCALES: Record<Locale, string> = { en: "en-GB", sq: "sq-AL" };

/**
 * Euro cents to a display string. Whole euros lose the ",00" because every
 * price in this fleet is a round number and the decimals are just noise.
 */
export function formatEuros(cents: number, locale: Locale = "en"): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}
