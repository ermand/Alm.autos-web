import { siteSettings } from "~/db/schema.ts";
import { getDb, hasDatabase } from "./db.ts";

/**
 * Contact details are the one thing that changes without warning and breaks the
 * business when stale, so they live in the CMS. Defaults come from the old site
 * and are used until the CMS is populated.
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

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!hasDatabase()) return DEFAULT_SETTINGS;

  const rows = await getDb().select().from(siteSettings);
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

/** E.164 digits only, which is what wa.me expects. */
export function whatsappLink(settings: SiteSettings, message?: string): string {
  const base = `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(settings: SiteSettings): string {
  return `tel:${settings.phone.replace(/[^\d+]/g, "")}`;
}
