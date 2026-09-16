import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { EnquiryForm } from "~/components/EnquiryForm.tsx";
import { whatsappLink } from "~/domain/contact.ts";
import { formatEuros } from "~/domain/money.ts";
import { photoSrc, photoSrcSet } from "~/domain/photos.ts";
import { fromPriceCents, hasTieredPricing, TIERS } from "~/domain/pricing.ts";
import { type Vehicle, vehicleTitle } from "~/domain/vehicle.ts";
import { messagesFor, toLocale } from "~/i18n/messages.ts";
import { localePath } from "~/i18n/paths.ts";
import { fetchVehicle } from "~/server/functions.ts";

export const Route = createFileRoute("/$lang/cars/$slug")({
  loader: async ({ params }) => {
    const result = await fetchVehicle({ data: { slug: params.slug } });
    if (!result.vehicle) throw notFound();
    return result;
  },
  head: ({ loaderData, params }) => {
    const vehicle = loaderData?.vehicle;
    if (!vehicle) return {};
    const title = `${vehicleTitle(vehicle)} — ALM Autos`;
    const price = formatEuros(fromPriceCents(vehicle.baseRates), toLocale(params.lang));
    return {
      meta: [
        { title },
        {
          name: "description",
          content:
            params.lang === "sq"
              ? `${vehicle.model} me qira në Tiranë, nga ${price} në ditë.`
              : `Rent a ${vehicle.model} in Tirana from ${price} per day.`,
        },
        { property: "og:title", content: title },
      ],
    };
  },
  component: VehiclePage,
});

function VehiclePage() {
  const { lang } = Route.useParams();
  const locale = toLocale(lang);
  const { vehicle, settings } = Route.useLoaderData();
  const t = messagesFor(locale);

  if (!vehicle) return null;

  const specs = [
    { label: t.vehicle.year, value: String(vehicle.year) },
    {
      label: t.vehicle.transmission,
      value: vehicle.transmission ? t.transmission[vehicle.transmission] : null,
    },
    { label: t.vehicle.fuel, value: vehicle.fuel ? t.fuel[vehicle.fuel] : null },
    { label: t.vehicle.bodyType, value: vehicle.bodyType ? t.bodyType[vehicle.bodyType] : null },
    { label: t.vehicle.seats, value: vehicle.seats ? String(vehicle.seats) : null },
    { label: t.vehicle.doors, value: vehicle.doors ? String(vehicle.doors) : null },
    {
      label: t.vehicle.airConditioning,
      value: vehicle.airConditioning === null ? null : vehicle.airConditioning ? t.yes : t.no,
    },
    // Absent specs are omitted rather than shown blank: the fleet is only
    // partially documented and a blank row reads like a defect.
  ].filter((spec): spec is { label: string; value: string } => spec.value !== null);

  const description = locale === "sq" ? vehicle.descriptionSq : vehicle.descriptionEn;
  const prefill = `${t.vehicle.whatsappPrefill} ${vehicleTitle(vehicle)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: vehicleTitle(vehicle),
    vehicleModelDate: String(vehicle.year),
    ...(vehicle.transmission ? { vehicleTransmission: vehicle.transmission } : {}),
    ...(vehicle.seats ? { seatingCapacity: vehicle.seats } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: (fromPriceCents(vehicle.baseRates) / 100).toFixed(2),
      // No availability key: the site never claims a Vehicle is free on given
      // dates, and schema.org/InStock is exactly that claim. See docs/adr/0001.
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to={localePath(locale, "cars")} className="text-sm text-maroon-700 hover:underline">
        ← {t.vehicle.back}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          <Gallery vehicle={vehicle} />
        </div>

        <div>
          <h1 className="font-display text-3xl text-ink-900">{vehicle.model}</h1>
          <p className="mt-1 text-ink-500">{vehicle.year}</p>

          <p className="mt-4">
            {hasTieredPricing(vehicle.baseRates) ? (
              <span className="text-xs uppercase tracking-wide text-ink-500">{t.fleet.from} </span>
            ) : null}
            <span className="font-display text-3xl text-maroon-700">
              {formatEuros(fromPriceCents(vehicle.baseRates), locale)}
            </span>
            <span className="text-ink-500">{t.fleet.perDay}</span>
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={whatsappLink(settings, prefill)}
              className="rounded-full bg-maroon-700 px-6 py-3 font-medium text-white hover:bg-maroon-600"
            >
              {t.home.whatsapp}
            </a>
            <a
              href="#enquire"
              className="rounded-full border border-maroon-700 px-6 py-3 font-medium text-maroon-700 hover:bg-maroon-50"
            >
              {t.vehicle.enquire}
            </a>
          </div>

          {description ? <p className="mt-6 text-ink-700">{description}</p> : null}

          {specs.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-lg text-ink-900">{t.vehicle.specs}</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {specs.map((spec) => (
                  <div key={spec.label} className="contents">
                    <dt className="text-ink-500">{spec.label}</dt>
                    <dd className="text-ink-900">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {hasTieredPricing(vehicle.baseRates) ? (
            <section className="mt-8">
              <h2 className="font-display text-lg text-ink-900">{t.vehicle.pricing}</h2>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {TIERS.map((tier) => (
                    <tr key={tier} className="border-b border-sand-200 last:border-0">
                      <th scope="row" className="py-2 text-left font-normal text-ink-500">
                        {tier} {t.vehicle.days}
                      </th>
                      <td className="py-2 text-right text-ink-900">
                        {formatEuros(vehicle.baseRates[tier], locale)}
                        <span className="text-ink-500">{t.fleet.perDay}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-ink-500">{t.vehicle.pricingNote}</p>
            </section>
          ) : null}
        </div>
      </div>

      <section id="enquire" className="mt-16 max-w-3xl scroll-mt-24">
        <h2 className="font-display text-2xl text-ink-900">{t.enquiry.title}</h2>
        <p className="mt-2 text-ink-500">{t.enquiry.subtitle}</p>
        <div className="mt-6">
          <EnquiryForm locale={locale} vehicleSlug={vehicle.slug} />
        </div>
      </section>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has no other injection point.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

function Gallery({ vehicle }: { vehicle: Vehicle }) {
  const [first, ...rest] = vehicle.photos;

  if (!first) {
    return <div className="aspect-[4/3] rounded-2xl bg-sand-200" aria-hidden="true" />;
  }

  return (
    <div className="grid gap-3">
      <img
        src={photoSrc(first.path, 1600)}
        srcSet={photoSrcSet(first.path)}
        sizes="(min-width: 1024px) 700px, 92vw"
        alt={vehicleTitle(vehicle)}
        width={1600}
        height={1200}
        className="aspect-[4/3] w-full rounded-2xl object-cover"
      />

      {rest.length > 0 ? (
        <ul className="grid grid-cols-4 gap-3">
          {rest.map((photo) => (
            <li key={photo.id}>
              <img
                src={photoSrc(photo.path, 400)}
                alt=""
                width={400}
                height={300}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-xl object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
