/**
 * Contact details and the links built from them.
 *
 * This module is deliberately free of server imports. It used to live in
 * src/server/settings.ts, which imports the Postgres driver — and because
 * `whatsappLink` and `telLink` are ordinary functions rather than server
 * functions, importing them from a component pulled the driver into the browser
 * bundle. Production tree-shaking hid it; the dev server did not, and failed
 * with "Buffer is not defined".
 *
 * Anything a component needs belongs here. Anything that touches the database
 * belongs in src/server/settings.ts.
 */

export interface SiteSettings {
  phone: string;
  whatsapp: string;
  email: string;
  addressLine: string;
  city: string;
  instagram: string;
  facebook: string;
  mapsQuery: string;
  hours: string;
}

/** Used until the CMS is populated; taken from the old site. */
export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "+355 68 56 588 88",
  whatsapp: "355685658888",
  email: "arben.majko@gmail.com",
  addressLine: "Rruga Arbëria, ndërtesa 66",
  city: "Kashar, Tiranë",
  instagram: "https://instagram.com/alm_autos22",
  facebook: "",
  mapsQuery: "Tirane,Kashar,DHL (ALM Autos)",
  hours: "",
};

/** E.164 digits only, which is what wa.me expects. */
export function whatsappLink(settings: SiteSettings, message?: string): string {
  const base = `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(settings: SiteSettings): string {
  return `tel:${settings.phone.replace(/[^\d+]/g, "")}`;
}
