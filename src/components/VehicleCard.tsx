import { Link } from "@tanstack/react-router";
import { VehicleCardPhoto } from "~/components/VehiclePhoto.tsx";
import { formatEuros } from "~/domain/money.ts";
import { fromPriceCents, hasTieredPricing } from "~/domain/pricing.ts";
import type { Vehicle } from "~/domain/vehicle.ts";
import { type Locale, messagesFor } from "~/i18n/messages.ts";
import { vehiclePath } from "~/i18n/paths.ts";

interface Props {
  vehicle: Vehicle;
  locale: Locale;
  priority?: boolean;
  /**
   * The card title has to sit one level below whatever heading introduces the
   * list it is in, or the page skips a level. Directly under a page h1 that
   * means h2; inside a section with its own h2 it means h3.
   */
  headingLevel?: 2 | 3;
}

export function VehicleCard({ vehicle, locale, priority, headingLevel = 2 }: Props) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const t = messagesFor(locale);

  // Specs are optional on purpose — the fleet launches partially documented, so
  // a card with nothing but a gearbox must still look deliberate.
  const badges = [
    vehicle.transmission ? t.transmission[vehicle.transmission] : null,
    vehicle.bodyType ? t.bodyType[vehicle.bodyType] : null,
    vehicle.seats ? `${vehicle.seats} ${t.vehicle.seats.toLowerCase()}` : null,
  ].filter((badge): badge is string => badge !== null);

  return (
    <article className="group overflow-hidden rounded-2xl border border-sand-200 bg-white transition-shadow hover:shadow-lg">
      <Link to={vehiclePath(locale, vehicle.slug)} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-sand-100">
          <VehicleCardPhoto
            vehicle={vehicle}
            sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 92vw"
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>

        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <Heading className="font-display text-lg text-ink-900">{vehicle.model}</Heading>
            <span className="text-sm text-ink-500">{vehicle.year}</span>
          </div>

          {badges.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <li
                  key={badge}
                  className="rounded-full bg-sand-100 px-2.5 py-0.5 text-xs text-ink-700"
                >
                  {badge}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-ink-900">
            {hasTieredPricing(vehicle.baseRates) ? (
              <span className="text-xs uppercase tracking-wide text-ink-500">{t.fleet.from} </span>
            ) : null}
            <span className="font-display text-xl text-brand-500">
              {formatEuros(fromPriceCents(vehicle.baseRates), locale)}
            </span>
            <span className="text-sm text-ink-500">{t.fleet.perDay}</span>
          </p>
        </div>
      </Link>
    </article>
  );
}
