import { createFileRoute, Link } from "@tanstack/react-router";
import { VehicleCard } from "~/components/VehicleCard.tsx";
import { telLink, whatsappLink } from "~/domain/contact.ts";
import { formatEuros } from "~/domain/money.ts";
import { photoSrc, photoSrcSet } from "~/domain/photos.ts";
import { fromPriceCents } from "~/domain/pricing.ts";
import { cardPhoto } from "~/domain/vehicle.ts";
import { messagesFor, toLocale } from "~/i18n/messages.ts";
import { localePath } from "~/i18n/paths.ts";
import { fetchFleet } from "~/server/functions.ts";

export const Route = createFileRoute("/$lang/")({
  loader: async () => fetchFleet(),
  head: ({ params }) => ({
    meta: [
      {
        title:
          params.lang === "sq"
            ? "ALM Autos — Makina me qira në Tiranë"
            : "ALM Autos — Rent a car in Tirana",
      },
      {
        name: "description",
        content:
          params.lang === "sq"
            ? "Makina të besueshme me qira në Tiranë. Çmime të ndershme, marrje në Kashar ose në aeroport."
            : "Reliable cars for rent in Tirana. Honest prices, pick-up in Kashar or at the airport.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { lang } = Route.useParams();
  const locale = toLocale(lang);
  const { vehicles, settings } = Route.useLoaderData();
  const t = messagesFor(locale);

  // The hero image is a real car from the fleet, not stock photography. It is
  // whichever car the owner has put first — featured, then manual order — so
  // the picture on the front page is his choice, made in the CMS.
  const hero = vehicles[0];
  const heroPhoto = hero ? cardPhoto(hero) : undefined;
  const lowest = vehicles.length
    ? formatEuros(Math.min(...vehicles.map((v) => fromPriceCents(v.baseRates))), locale)
    : null;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink-900">
        {heroPhoto ? (
          <img
            src={photoSrc(heroPhoto.path, 1600)}
            srcSet={photoSrcSet(heroPhoto.path)}
            sizes="100vw"
            alt=""
            width={1600}
            height={1200}
            // These are phone snapshots taken in a yard. They carry a page far
            // better as a darkened backdrop than as the subject.
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
          />
        ) : null}
        {/* Dark enough on the left for the text to clear AA, clear enough on
            the right that the car is still recognisably a car. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-900 via-ink-900/80 to-ink-900/25" />

        <div className="mx-auto max-w-6xl px-4 py-20 md:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400">
            {settings.city}
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-[1.05] text-white md:text-6xl">
            {t.home.title}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-sand-200">{t.home.subtitle}</p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to={localePath(locale, "cars")}
              className="rounded-full bg-brand-500 px-7 py-3.5 font-medium text-white transition-colors hover:bg-brand-600"
            >
              {t.home.cta}
            </Link>
            <a
              href={whatsappLink(settings)}
              className="rounded-full border border-white/30 px-7 py-3.5 font-medium text-white transition-colors hover:border-white hover:bg-white/10"
            >
              {t.home.whatsapp}
            </a>
            <a
              href={telLink(settings)}
              className="px-2 py-3.5 font-display text-xl text-white transition-colors hover:text-brand-400"
            >
              {settings.phone}
            </a>
          </div>

          {/* Two numbers that answer the first two questions anyone has. */}
          <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-4 border-t border-white/15 pt-6">
            <div>
              <dt className="text-xs uppercase tracking-wide text-sand-300">{t.home.fleetSize}</dt>
              <dd className="font-display text-2xl text-white">{vehicles.length}</dd>
            </div>
            {lowest ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-sand-300">{t.fleet.from}</dt>
                <dd className="font-display text-2xl text-white">
                  {lowest}
                  <span className="text-base text-sand-300">{t.fleet.perDay}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      {/* What actually distinguishes this company, rather than three generic
          steps that describe renting a car anywhere. */}
      <section className="border-b border-sand-200 bg-white">
        <ul className="mx-auto grid max-w-6xl gap-px bg-sand-200 sm:grid-cols-3">
          {t.home.trust.map((item) => (
            <li key={item.title} className="bg-white px-6 py-8">
              <h2 className="font-display text-lg text-ink-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-display text-3xl text-ink-900">{t.fleet.title}</h2>
          <Link
            to={localePath(locale, "cars")}
            className="text-sm font-medium text-brand-500 hover:underline"
          >
            {t.home.browseAll} →
          </Link>
        </div>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.slice(0, 6).map((vehicle, index) => (
            <li key={vehicle.id}>
              <VehicleCard
                vehicle={vehicle}
                locale={locale}
                headingLevel={3}
                priority={index < 3}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
