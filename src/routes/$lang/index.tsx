import { createFileRoute, Link } from "@tanstack/react-router";
import { VehicleCard } from "~/components/VehicleCard.tsx";
import { type Locale, messagesFor } from "~/i18n/messages.ts";
import { localePath } from "~/i18n/paths.ts";
import { fetchFleet } from "~/server/functions.ts";
import { telLink, whatsappLink } from "~/server/settings.ts";

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
  const locale = lang as Locale;
  const { vehicles, settings } = Route.useLoaderData();
  const t = messagesFor(locale);

  const highlights = vehicles.slice(0, 3);

  return (
    <>
      <section className="border-b border-sand-200 bg-gradient-to-b from-sand-100 to-sand-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="font-display text-4xl leading-tight text-ink-900 md:text-5xl">
              {t.home.title}
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink-500">{t.home.subtitle}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={localePath(locale, "cars")}
                className="rounded-full bg-maroon-700 px-6 py-3 font-medium text-white transition-colors hover:bg-maroon-600"
              >
                {t.home.cta}
              </Link>
              <a
                href={whatsappLink(settings)}
                className="rounded-full border border-maroon-700 px-6 py-3 font-medium text-maroon-700 transition-colors hover:bg-maroon-50"
              >
                {t.home.whatsapp}
              </a>
            </div>

            <a
              href={telLink(settings)}
              className="mt-6 inline-block font-display text-xl text-maroon-700 hover:underline"
            >
              {settings.phone}
            </a>
          </div>

          {highlights[0] ? (
            <div className="hidden md:block">
              <VehicleCard vehicle={highlights[0]} locale={locale} priority />
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl text-ink-900">{t.home.stepsTitle}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {t.home.steps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-sand-200 bg-white p-6">
              <span className="font-display text-3xl text-terracotta-500">{index + 1}</span>
              <h3 className="mt-3 font-display text-lg text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-500">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl text-ink-900">{t.fleet.title}</h2>
          <Link to={localePath(locale, "cars")} className="text-sm text-maroon-700 hover:underline">
            {t.home.cta}
          </Link>
        </div>

        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {highlights.map((vehicle) => (
            <li key={vehicle.id}>
              <VehicleCard vehicle={vehicle} locale={locale} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
