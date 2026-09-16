/** Published photo variants. Kept in step with scripts/process-images.ts. */
export const VARIANT_WIDTHS = [400, 800, 1600] as const;

export function photoSrc(basename: string, width: (typeof VARIANT_WIDTHS)[number]): string {
  return `/media/${basename}-${width}.webp`;
}

export function photoSrcSet(basename: string): string {
  return VARIANT_WIDTHS.map((width) => `${photoSrc(basename, width)} ${width}w`).join(", ");
}
