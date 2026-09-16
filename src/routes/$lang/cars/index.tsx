import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { VehicleCard } from "~/components/VehicleCard.tsx";
import { BODY_TYPES, TRANSMISSIONS } from "~/domain/vehicle.ts";
import { messagesFor, toLocale } from "~/i18n/messages.ts";
import { fetchFleet } from "~/server/functions.ts";

const searchSchema = z.object({
  gearbox: z.enum(TRANSMISSIONS).optional(),
  type: z.enum(BODY_TYPES).optional(),
});

export const Route = createFileRoute("/$lang/cars/")({
  validateSearch: searchSchema,
  loader: async () => fetchFleet(),
  head: ({ params }) => ({
    meta: [
      { title: params.lang === "sq" ? "Makinat — ALM Autos" : "Our cars — ALM Autos" },
      {
        name: "description",
        content:
          params.lang === "sq"
            ? "Makina me qira në Tiranë. Çmime për ditë, pa surpriza."
            : "Cars for rent in Tirana. Daily prices, no surprises.",
      },
    ],
  }),
  component: FleetPage,
});

function FleetPage() {
  const { lang } = Route.useParams();
  const locale = toLocale(lang);
  const { vehicles } = Route.useLoaderData();
  const search = Route.useSearch();
  const t = messagesFor(locale);

  const visible = vehicles.filter((vehicle) => {
    if (search.gearbox && vehicle.transmission !== search.gearbox) return false;
    if (search.type && vehicle.bodyType !== search.type) return false;
    return true;
  });

  // Only offer a filter value the fleet actually has — filtering to an empty
  // page is a dead end, and specs are incomplete by design.
  const gearboxes = TRANSMISSIONS.filter((value) =>
    vehicles.some((vehicle) => vehicle.transmission === value),
  );
  const bodyTypes = BODY_TYPES.filter((value) =>
    vehicles.some((vehicle) => vehicle.bodyType === value),
  );

  const filtered = Boolean(search.gearbox || search.type);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl text-ink-900">{t.fleet.title}</h1>
        <p className="mt-3 text-ink-500">{t.fleet.subtitle}</p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {gearboxes.length > 1 ? (
          <FilterGroup
            label={t.fleet.filters.transmission}
            options={gearboxes.map((value) => ({ value, label: t.transmission[value] }))}
            active={search.gearbox}
            toKey="gearbox"
          />
        ) : null}

        {bodyTypes.length > 1 ? (
          <FilterGroup
            label={t.fleet.filters.bodyType}
            options={bodyTypes.map((value) => ({ value, label: t.bodyType[value] }))}
            active={search.type}
            toKey="type"
          />
        ) : null}

        {filtered ? (
          <Link
            to="."
            search={{}}
            className="rounded-full px-3 py-1.5 text-sm text-brand-500 underline"
          >
            {t.fleet.filters.reset}
          </Link>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="mt-12 text-ink-500">{t.fleet.empty}</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((vehicle, index) => (
            <li key={vehicle.id}>
              <VehicleCard vehicle={vehicle} locale={locale} priority={index < 3} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FilterGroupProps {
  label: string;
  options: { value: string; label: string }[];
  active: string | undefined;
  toKey: "gearbox" | "type";
}

function FilterGroup({ label, options, active, toKey }: FilterGroupProps) {
  return (
    <fieldset className="flex items-center gap-1.5">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden="true" className="text-xs uppercase tracking-wide text-ink-500">
        {label}
      </span>
      {options.map((option) => {
        const selected = active === option.value;
        return (
          <Link
            key={option.value}
            to="."
            search={(prev: Record<string, unknown>) => ({
              ...prev,
              [toKey]: selected ? undefined : option.value,
            })}
            aria-pressed={selected}
            className={
              selected
                ? "rounded-full bg-brand-500 px-3 py-1.5 text-sm text-white"
                : "rounded-full border border-sand-200 bg-white px-3 py-1.5 text-sm text-ink-700 hover:border-brand-400"
            }
          >
            {option.label}
          </Link>
        );
      })}
    </fieldset>
  );
}
