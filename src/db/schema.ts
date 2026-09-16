import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { BaseRates } from "~/domain/pricing.ts";
import { BODY_TYPES, FUELS, TRANSMISSIONS, VEHICLE_STATUSES } from "~/domain/vehicle.ts";

export const transmissionEnum = pgEnum("transmission", TRANSMISSIONS);
export const fuelEnum = pgEnum("fuel", FUELS);
export const bodyTypeEnum = pgEnum("body_type", BODY_TYPES);
export const vehicleStatusEnum = pgEnum("vehicle_status", VEHICLE_STATUSES);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 120 }).notNull(),
    model: varchar("model", { length: 120 }).notNull(),
    year: smallint("year").notNull(),

    // Specs are nullable by design: the fleet launches partially documented and
    // the owner fills these in over time. See docs/PLAN.md.
    transmission: transmissionEnum("transmission"),
    fuel: fuelEnum("fuel"),
    bodyType: bodyTypeEnum("body_type"),
    seats: smallint("seats"),
    doors: smallint("doors"),
    airConditioning: boolean("air_conditioning"),

    descriptionEn: text("description_en"),
    descriptionSq: text("description_sq"),

    status: vehicleStatusEnum("status").notNull().default("published"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),

    /** Euro cents per day, one entry per Tier. */
    baseRates: jsonb("base_rates").$type<BaseRates>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("vehicles_slug_idx").on(table.slug),
    index("vehicles_status_idx").on(table.status),
  ],
);

export const vehiclePhotos = pgTable(
  "vehicle_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    /** Basename in the shared upload directory; variants are derived from it. */
    path: varchar("path", { length: 255 }).notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("vehicle_photos_vehicle_idx").on(table.vehicleId, table.position)],
);

/**
 * A Season is fleet-wide and recurs every year, so the owner sets it once rather
 * than re-keying dates each January. `from` after `to` wraps the new year.
 */
export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull(),
  fromMonth: smallint("from_month").notNull(),
  fromDay: smallint("from_day").notNull(),
  toMonth: smallint("to_month").notNull(),
  toDay: smallint("to_day").notNull(),
  multiplier: real("multiplier").notNull(),
  /** Lower wins where two seasons overlap. */
  position: integer("position").notNull().default(0),
});

/**
 * An Enquiry commits no one and reserves nothing — the conversation continues on
 * WhatsApp. Deleted after 12 months (GDPR retention).
 */
export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    pickupDate: varchar("pickup_date", { length: 10 }),
    dropoffDate: varchar("dropoff_date", { length: 10 }),
    message: text("message"),
    locale: varchar("locale", { length: 2 }).notNull(),
    /** Set when the owner marks an Enquiry dealt with; triage only, never a booking. */
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("enquiries_created_idx").on(table.createdAt)],
);

/** Contact details change without warning; page prose does not and stays in code. */
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value").notNull(),
});

/**
 * One owner account, created by hand with scripts/create-admin.ts. No
 * self-signup, no 2FA, no self-service reset — a forgotten password is a phone
 * call either way, and a lockout would be worse for a one-person business.
 */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** `id` is a SHA-256 of the cookie token, so a database leak yields no usable session. */
export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_sessions_user_idx").on(table.userId)],
);
