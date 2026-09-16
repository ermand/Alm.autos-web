import type { BaseRates } from "./pricing.ts";

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

export interface VehiclePhoto {
  readonly id: string;
  readonly path: string;
  readonly position: number;
}

export interface Vehicle {
  readonly id: string;
  /** Prefilled from model and year, frozen once published so indexed URLs hold. */
  readonly slug: string;
  readonly model: string;
  readonly year: number;

  // Specs are nullable by design: the fleet launches partially documented and
  // the owner fills these in over time.
  readonly transmission: Transmission | null;
  readonly fuel: Fuel | null;
  readonly bodyType: BodyType | null;
  readonly seats: number | null;
  readonly doors: number | null;
  readonly airConditioning: boolean | null;

  readonly descriptionEn: string | null;
  readonly descriptionSq: string | null;

  readonly status: VehicleStatus;
  readonly featured: boolean;
  readonly sortOrder: number;
  readonly baseRates: BaseRates;
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
