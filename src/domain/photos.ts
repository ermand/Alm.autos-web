/** Published photo variants. Kept in step with scripts/process-images.ts. */
export const VARIANT_WIDTHS = [400, 800, 1600] as const;

export function photoSrc(basename: string, width: (typeof VARIANT_WIDTHS)[number]): string {
  return `/media/${basename}-${width}.webp`;
}

export function photoSrcSet(basename: string): string {
  return VARIANT_WIDTHS.map((width) => `${photoSrc(basename, width)} ${width}w`).join(", ");
}

/**
 * Published variant filenames, e.g. `audi-q5-2012-1-800.webp`.
 *
 * Anything not matching this is refused: the name arrives from a URL and gets
 * joined to a filesystem path. Shared by the server route and the dev-server
 * middleware in vite.config.ts.
 */
const VARIANT_FILENAME = /^[a-z0-9]+(?:-[a-z0-9]+)*-(?:400|800|1600)\.webp$/;

export function isSafeVariantFilename(filename: string): boolean {
  return VARIANT_FILENAME.test(filename);
}
