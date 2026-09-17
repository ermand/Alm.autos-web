import { describe, expect, it } from "vitest";
import { isSafeVariantFilename, photoSrc, photoSrcSet } from "./photos.ts";

describe("isSafeVariantFilename", () => {
  it("accepts a real variant name", () => {
    expect(isSafeVariantFilename("audi-q5-2012-1-800.webp")).toBe(true);
    expect(isSafeVariantFilename("vw-golf-6-plus-2010-2-1600.webp")).toBe(true);
  });

  it("refuses anything that escapes the upload directory", () => {
    expect(isSafeVariantFilename("../../etc/passwd")).toBe(false);
    expect(isSafeVariantFilename("car-1-800.webp/../../x")).toBe(false);
    expect(isSafeVariantFilename("/etc/passwd")).toBe(false);
  });

  it("refuses a width we do not generate", () => {
    expect(isSafeVariantFilename("car-1-999.webp")).toBe(false);
    expect(isSafeVariantFilename("car-1-401.webp")).toBe(false);
  });

  it("refuses any extension but webp", () => {
    expect(isSafeVariantFilename("car-1-800.txt")).toBe(false);
    expect(isSafeVariantFilename("car-1-800.webp.txt")).toBe(false);
    expect(isSafeVariantFilename("car-1-800")).toBe(false);
  });

  it("refuses uppercase and spaces", () => {
    expect(isSafeVariantFilename("Car-1-800.webp")).toBe(false);
    expect(isSafeVariantFilename("car 1-800.webp")).toBe(false);
  });
});

describe("photo urls", () => {
  it("builds a same-origin media path", () => {
    expect(photoSrc("audi-q5-2012-1", 800)).toBe("/media/audi-q5-2012-1-800.webp");
  });

  it("offers every width in the srcset", () => {
    expect(photoSrcSet("audi-q5-2012-1")).toBe(
      "/media/audi-q5-2012-1-400.webp 400w, /media/audi-q5-2012-1-800.webp 800w, /media/audi-q5-2012-1-1600.webp 1600w",
    );
  });

  it("produces names the server route will accept", () => {
    for (const width of [400, 800, 1600] as const) {
      const url = photoSrc("audi-q5-2012-1", width);
      expect(isSafeVariantFilename(url.replace("/media/", ""))).toBe(true);
    }
  });
});
