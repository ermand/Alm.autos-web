import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAttempts,
  hashPassword,
  recordFailedAttempt,
  tooManyAttempts,
  verifyPassword,
} from "./auth.ts";

describe("password hashing", () => {
  it("accepts the correct password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("Correct horse battery staple", stored)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("never stores the password itself", async () => {
    const stored = await hashPassword("hunter2");
    expect(stored).not.toContain("hunter2");
    expect(stored.startsWith("scrypt:")).toBe(true);
  });

  it("rejects a malformed stored hash rather than throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt:salt:hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt:onlysalt")).toBe(false);
  });

  it("rejects a stored hash of the wrong length without throwing", async () => {
    // timingSafeEqual throws on mismatched lengths; the guard must catch it.
    expect(await verifyPassword("x", "scrypt:abcd:00ff")).toBe(false);
  });
});

describe("login throttling", () => {
  beforeEach(() => {
    clearAttempts("1.2.3.4");
  });

  it("allows attempts below the limit", () => {
    for (let i = 0; i < 7; i++) recordFailedAttempt("1.2.3.4");
    expect(tooManyAttempts("1.2.3.4")).toBe(false);
  });

  it("blocks once the limit is reached", () => {
    for (let i = 0; i < 8; i++) recordFailedAttempt("1.2.3.4");
    expect(tooManyAttempts("1.2.3.4")).toBe(true);
  });

  it("throttles each client separately", () => {
    for (let i = 0; i < 8; i++) recordFailedAttempt("1.2.3.4");
    expect(tooManyAttempts("5.6.7.8")).toBe(false);
  });

  it("forgets the count after a successful login", () => {
    for (let i = 0; i < 8; i++) recordFailedAttempt("1.2.3.4");
    clearAttempts("1.2.3.4");
    expect(tooManyAttempts("1.2.3.4")).toBe(false);
  });
});
