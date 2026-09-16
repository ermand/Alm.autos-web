import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminUsers, enquiries, seasons, vehicles } from "~/db/schema.ts";
import { hashPassword } from "~/server/auth.ts";

/**
 * Integration tests against a real Postgres.
 *
 * Skipped unless DATABASE_URL points at a throwaway database — these write and
 * delete rows. The suite covers the parts that only break against a real
 * database or filesystem: session lifecycle, retention, slug uniqueness, and
 * the photo pipeline.
 */
const DB_URL = process.env.DATABASE_URL;
const run = DB_URL ? describe : describe.skip;

run("admin integration", () => {
  let db: Awaited<ReturnType<typeof import("~/server/db.ts").getDb>>;
  let auth: typeof import("~/server/auth.ts");
  let media: typeof import("~/server/media.ts");
  let enquiryOps: typeof import("~/server/admin/enquiries.ts");
  let fleet: typeof import("~/server/fleet.ts");

  beforeAll(async () => {
    process.env.UPLOADS_DIR = resolve(process.cwd(), ".uploads-test");
    const dbModule = await import("~/server/db.ts");
    db = dbModule.getDb();
    auth = await import("~/server/auth.ts");
    media = await import("~/server/media.ts");
    enquiryOps = await import("~/server/admin/enquiries.ts");
    fleet = await import("~/server/fleet.ts");
  });

  afterAll(async () => {
    await rm(resolve(process.cwd(), ".uploads-test"), { recursive: true, force: true });
  });

  describe("sessions", () => {
    it("issues a session that resolves, then stops resolving once destroyed", async () => {
      const email = `session-${Date.now()}@test.local`;
      const [user] = await db
        .insert(adminUsers)
        .values({ email, passwordHash: await hashPassword("a-long-enough-password") })
        .returning({ id: adminUsers.id });

      if (!user) throw new Error("no user");

      const { token } = await auth.createSession(user.id);
      expect((await auth.resolveSession(token))?.email).toBe(email);

      await auth.destroySession(token);
      expect(await auth.resolveSession(token)).toBeNull();

      await db.delete(adminUsers).where(eq(adminUsers.id, user.id));
    });

    it("refuses an unknown token", async () => {
      expect(await auth.resolveSession("not-a-real-token")).toBeNull();
      expect(await auth.resolveSession(undefined)).toBeNull();
    });

    it("refuses an expired session", async () => {
      const email = `expired-${Date.now()}@test.local`;
      const [user] = await db
        .insert(adminUsers)
        .values({ email, passwordHash: await hashPassword("a-long-enough-password") })
        .returning({ id: adminUsers.id });
      if (!user) throw new Error("no user");

      const { token } = await auth.createSession(user.id);
      const { adminSessions } = await import("~/db/schema.ts");
      await db
        .update(adminSessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(adminSessions.userId, user.id));

      expect(await auth.resolveSession(token)).toBeNull();
      await db.delete(adminUsers).where(eq(adminUsers.id, user.id));
    });
  });

  describe("enquiry retention", () => {
    it("deletes enquiries past the retention window and keeps recent ones", async () => {
      const old = new Date(Date.now() - (enquiryOps.RETENTION_DAYS + 5) * 86_400_000);

      const [stale] = await db
        .insert(enquiries)
        .values({
          name: "Old",
          email: "old@test.local",
          phone: "+355",
          locale: "en",
          createdAt: old,
        })
        .returning({ id: enquiries.id });

      const [fresh] = await db
        .insert(enquiries)
        .values({ name: "New", email: "new@test.local", phone: "+355", locale: "sq" })
        .returning({ id: enquiries.id });

      if (!stale || !fresh) throw new Error("insert failed");

      await enquiryOps.purgeOldEnquiries();

      const staleRows = await db.select().from(enquiries).where(eq(enquiries.id, stale.id));
      const freshRows = await db.select().from(enquiries).where(eq(enquiries.id, fresh.id));

      expect(staleRows).toHaveLength(0);
      expect(freshRows).toHaveLength(1);

      await db.delete(enquiries).where(eq(enquiries.id, fresh.id));
    });
  });

  describe("published fleet", () => {
    it("shows published vehicles and hides the rest", async () => {
      const [hidden] = await db
        .insert(vehicles)
        .values({
          slug: `hidden-car-${Date.now()}`,
          model: "Hidden Car",
          year: 2020,
          status: "hidden",
          baseRates: { "1-3": 1000, "4-7": 1000, "8-29": 1000, "30+": 1000 },
        })
        .returning({ id: vehicles.id, slug: vehicles.slug });

      if (!hidden) throw new Error("insert failed");

      const published = await fleet.listPublishedVehicles();
      expect(published.some((vehicle) => vehicle.slug === hidden.slug)).toBe(false);
      expect(await fleet.getPublishedVehicle(hidden.slug)).toBeUndefined();

      await db.update(vehicles).set({ status: "published" }).where(eq(vehicles.id, hidden.id));
      expect((await fleet.getPublishedVehicle(hidden.slug))?.model).toBe("Hidden Car");

      await db.delete(vehicles).where(eq(vehicles.id, hidden.id));
    });

    it("refuses two vehicles with the same slug", async () => {
      const slug = `dup-${Date.now()}`;
      const rates = { "1-3": 1000, "4-7": 1000, "8-29": 1000, "30+": 1000 };

      const [first] = await db
        .insert(vehicles)
        .values({ slug, model: "First", year: 2020, baseRates: rates })
        .returning({ id: vehicles.id });
      if (!first) throw new Error("insert failed");

      await expect(
        db.insert(vehicles).values({ slug, model: "Second", year: 2021, baseRates: rates }),
      ).rejects.toThrow();

      await db.delete(vehicles).where(eq(vehicles.id, first.id));
    });
  });

  describe("seasons round-trip", () => {
    it("stores a new-year-wrapping season and reads it back", async () => {
      const [row] = await db
        .insert(seasons)
        .values({
          name: "Test New Year",
          fromMonth: 12,
          fromDay: 20,
          toMonth: 1,
          toDay: 5,
          multiplier: 1.2,
          position: 0,
        })
        .returning({ id: seasons.id });
      if (!row) throw new Error("insert failed");

      const { listSeasons } = await import("~/server/seasons.ts");
      const loaded = (await listSeasons()).find((season) => season.name === "Test New Year");

      expect(loaded).toBeDefined();
      expect(loaded?.from).toEqual({ month: 12, day: 20 });
      expect(loaded?.to).toEqual({ month: 1, day: 5 });
      expect(loaded?.multiplier).toBeCloseTo(1.2, 5);

      await db.delete(seasons).where(eq(seasons.id, row.id));
    });
  });

  describe("photo pipeline", () => {
    it("writes three variants, serves them, and deletes them", async () => {
      const sharp = (await import("sharp")).default;
      const source = await sharp({
        create: { width: 2000, height: 1500, channels: 3, background: "#6b1122" },
      })
        .jpeg()
        .toBuffer();

      const basename = `test-car-${Date.now()}-1`;
      await media.storePhoto(basename, source.buffer.slice(0) as ArrayBuffer);

      for (const width of [400, 800, 1600]) {
        const bytes = await media.readVariant(`${basename}-${width}.webp`);
        expect(bytes, `variant ${width}`).not.toBeNull();
        const meta = await sharp(bytes as Buffer).metadata();
        expect(meta.width).toBe(width);
        expect(meta.format).toBe("webp");
      }

      await media.deletePhoto(basename);
      expect(await media.readVariant(`${basename}-800.webp`)).toBeNull();
    });

    it("refuses a filename that escapes the upload directory", async () => {
      expect(media.isSafeVariantFilename("../../etc/passwd")).toBe(false);
      expect(media.isSafeVariantFilename("car-1-800.webp/../../x")).toBe(false);
      expect(media.isSafeVariantFilename("car-1-800.txt")).toBe(false);
      expect(media.isSafeVariantFilename("car-1-999.webp")).toBe(false);
      expect(media.isSafeVariantFilename("audi-q5-2012-1-800.webp")).toBe(true);
    });

    it("never reuses a photo number, so a cached URL cannot resurface", async () => {
      const slug = `numbering-${Date.now()}`;
      const sharp = (await import("sharp")).default;
      const source = await sharp({
        create: { width: 100, height: 100, channels: 3, background: "#fff" },
      })
        .jpeg()
        .toBuffer();

      const first = await media.nextPhotoBasename(slug);
      await media.storePhoto(first, source.buffer.slice(0) as ArrayBuffer);

      const second = await media.nextPhotoBasename(slug);
      expect(second).toBe(`${slug}-2`);

      await media.deletePhoto(first);
      // Even with the first deleted, numbering moves forward.
      expect(await media.nextPhotoBasename(slug)).toBe(`${slug}-1`);
    });
  });
});
