import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPublishedVehicle, listPublishedVehicles } from "./fleet.ts";
import { listSeasons } from "./seasons.ts";
import { getSiteSettings } from "./settings.ts";

/** Everything the site chrome needs: contact details that live in the CMS. */
export const fetchSettings = createServerFn({ method: "GET" }).handler(async () => {
  return getSiteSettings();
});

export const fetchFleet = createServerFn({ method: "GET" }).handler(async () => {
  const [vehicles, settings] = await Promise.all([listPublishedVehicles(), getSiteSettings()]);
  return { vehicles, settings };
});

export const fetchVehicle = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const [vehicle, settings, seasons] = await Promise.all([
      getPublishedVehicle(data.slug),
      getSiteSettings(),
      listSeasons(),
    ]);
    return { vehicle: vehicle ?? null, settings, seasons };
  });
