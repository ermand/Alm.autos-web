import { z } from "zod";
import { type BaseRates, TIERS, type Tier } from "./pricing.ts";

/**
 * A Vehicle is one physical car the company owns. Two cars of the same make and
 * model are two Vehicles — see CONTEXT.md and docs/adr/0001.
 */

export const TRANSMISSIONS = ["manual", "automatic"] as const;
export const FUELS = ["petrol", "diesel", "lpg", "hybrid", "electric"] as const;
export const BODY_TYPES = ["hatchback", "sedan", "suv", "van", "pickup", "convertible"] as const;

/** Lifecycle, never availability. `hidden` keeps the record, its photos and its URL. */
export const VEHICLE_STATUSES = ["published", "hidden", "retired"] as const;

export type Transmission = (typeof TRANSMISSIONS)[number];
export type Fuel = (typeof FUELS)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const baseRatesSchema = z.object(
  Object.fromEntries(TIERS.map((tier) => [tier, z.number().int().positive()])) as Record<
    Tier,
    z.ZodNumber
  >,
) satisfies z.ZodType<BaseRates>;

/**
 * Slugs are prefilled from model and year, editable, and frozen once published so
 * that indexed URLs never break.
 */
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

export const vehicleInputSchema = z.object({
  slug: slugSchema,
  model: z.string().min(1).max(120),
  year: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getUTCFullYear() + 1),
  transmission: z.enum(TRANSMISSIONS).nullable(),
  fuel: z.enum(FUELS).nullable(),
  bodyType: z.enum(BODY_TYPES).nullable(),
  seats: z.number().int().min(1).max(9).nullable(),
  doors: z.number().int().min(2).max(6).nullable(),
  airConditioning: z.boolean().nullable(),
  descriptionEn: z.string().max(2000).nullable(),
  descriptionSq: z.string().max(2000).nullable(),
  status: z.enum(VEHICLE_STATUSES),
  featured: z.boolean(),
  sortOrder: z.number().int(),
  baseRates: baseRatesSchema,
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export interface VehiclePhoto {
  readonly id: string;
  readonly path: string;
  readonly position: number;
}

export interface Vehicle extends VehicleInput {
  readonly id: string;
  readonly photos: readonly VehiclePhoto[];
}

/** Display name; the year disambiguates two cars of the same model. */
export function vehicleTitle(vehicle: Pick<Vehicle, "model" | "year">): string {
  return `${vehicle.model} (${vehicle.year})`;
}

/** The card image is simply the first photo of the gallery. */
export function cardPhoto(vehicle: Pick<Vehicle, "photos">): VehiclePhoto | undefined {
  return vehicle.photos[0];
}

/**
 * Fleet order: featured first, then the owner's manual order, then newest.
 * Stable so the grid does not shuffle between renders.
 */
export function compareVehicles(a: Vehicle, b: Vehicle): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return b.year - a.year;
}

export function suggestSlug(model: string, year: number): string {
  return `${model} ${year}`
    .toLowerCase()
    .replace(/\+/g, "-plus-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
