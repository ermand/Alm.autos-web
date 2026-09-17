import { describe, expect, it } from "vitest";
import { parseConfig } from "./config.ts";

describe("parseConfig", () => {
  it("runs on an empty environment, because the public site does", () => {
    const config = parseConfig({});
    expect(config.hasDatabase).toBe(false);
    expect(config.canSendEmail).toBe(false);
    expect(config.isProduction).toBe(false);
    expect(config.SITE_URL).toBe("https://alm.autos");
  });

  describe("isSecureOrigin", () => {
    it("follows the scheme the site is served over, not NODE_ENV", () => {
      // The case that matters: a live HTTPS site whose NODE_ENV was never set,
      // which would otherwise drop the Secure flag from the session cookie.
      const config = parseConfig({ SITE_URL: "https://alm.autos" });
      expect(config.isSecureOrigin).toBe(true);
      expect(config.isProduction).toBe(false);
    });

    it("is false for plain http, so local development can still sign in", () => {
      expect(parseConfig({ SITE_URL: "http://localhost:3000" }).isSecureOrigin).toBe(false);
    });

    it("defaults to true, because the default SITE_URL is the live https one", () => {
      expect(parseConfig({}).isSecureOrigin).toBe(true);
    });
  });

  it("treats a key with no value as absent, the way a .env means it", () => {
    expect(parseConfig({ DATABASE_URL: "postgres://x@localhost/db" }).hasDatabase).toBe(true);
    expect(parseConfig({ DATABASE_URL: "   " }).hasDatabase).toBe(false);
  });

  it("needs both halves before it will claim it can send email", () => {
    expect(parseConfig({ RESEND_API_KEY: "re_123" }).canSendEmail).toBe(false);
    expect(parseConfig({ ENQUIRY_FROM_EMAIL: "a@b.com" }).canSendEmail).toBe(false);
    expect(
      parseConfig({ RESEND_API_KEY: "re_123", ENQUIRY_FROM_EMAIL: "a@b.com" }).canSendEmail,
    ).toBe(true);
  });

  describe("SITE_URL", () => {
    it("strips a trailing slash, which would double up in canonical links", () => {
      expect(parseConfig({ SITE_URL: "https://alm.autos/" }).SITE_URL).toBe("https://alm.autos");
    });

    it("refuses something that is not a URL rather than serving broken links", () => {
      expect(() => parseConfig({ SITE_URL: "alm.autos" })).toThrow(/full URL/);
      // A key with no value means "not set", so the default applies.
      expect(parseConfig({ SITE_URL: "" }).SITE_URL).toBe("https://alm.autos");
    });
  });

  describe("UPLOADS_DIR", () => {
    it("keeps an absolute path as given", () => {
      expect(parseConfig({ UPLOADS_DIR: "/home/forge/alm-uploads" }).UPLOADS_DIR).toBe(
        "/home/forge/alm-uploads",
      );
    });

    it("resolves a relative path so a local .uploads just works", () => {
      expect(parseConfig({ UPLOADS_DIR: ".uploads" }).UPLOADS_DIR).toBe(
        `${process.cwd()}/.uploads`,
      );
    });
  });

  it("refuses an email address that is not one", () => {
    expect(() => parseConfig({ ENQUIRY_FROM_EMAIL: "not-an-address" })).toThrow(/ENQUIRY_FROM/);
  });

  it("names every problem at once, not just the first", () => {
    try {
      parseConfig({ SITE_URL: "nope", ENQUIRY_NOTIFY_EMAIL: "also-nope" });
      throw new Error("should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain("SITE_URL");
      expect(message).toContain("ENQUIRY_NOTIFY_EMAIL");
      expect(message).toContain(".env.example");
    }
  });

  describe("feature flags", () => {
    it("has none by default", () => {
      expect(parseConfig({}).flags).toEqual({});
    });

    it("reads any FLAG_ variable, dropping the prefix", () => {
      const { flags } = parseConfig({ FLAG_NEW_THING: "true", FLAG_OTHER: "false" });
      expect(flags).toEqual({ NEW_THING: true, OTHER: false });
    });

    it("accepts the spellings people actually type", () => {
      for (const on of ["true", "TRUE", "1", "yes", "on", " On "]) {
        expect(parseConfig({ FLAG_X: on }).flags.X, on).toBe(true);
      }
      for (const off of ["false", "0", "no", "off"]) {
        expect(parseConfig({ FLAG_X: off }).flags.X, off).toBe(false);
      }
    });

    it("refuses a value it cannot read rather than guessing off", () => {
      expect(() => parseConfig({ FLAG_X: "maybe" })).toThrow(/FLAG_X must be true or false/);
    });

    it("ignores variables that merely mention a flag", () => {
      expect(parseConfig({ MY_FLAG_X: "true" }).flags).toEqual({});
    });
  });

  it("is frozen, so nothing can rewrite configuration at runtime", () => {
    const config = parseConfig({ SITE_URL: "https://example.com" });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.flags)).toBe(true);
  });
});
