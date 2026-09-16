import { createFileRoute } from "@tanstack/react-router";
import { EnquiryForm } from "~/components/EnquiryForm.tsx";
import { telLink, whatsappLink } from "~/domain/contact.ts";
import { messagesFor, toLocale } from "~/i18n/messages.ts";
import { fetchSettings } from "~/server/functions.ts";

export const Route = createFileRoute("/$lang/contact")({
  loader: async () => ({ settings: await fetchSettings() }),
  component: ContactPage,
});

function ContactPage() {
  const { lang } = Route.useParams();
  const locale = toLocale(lang);
  const { settings } = Route.useLoaderData();
  const t = messagesFor(locale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-4xl text-ink-900">{t.contact.title}</h1>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <div>
          <p className="text-ink-700">
            {settings.addressLine}
            <br />
            {settings.city}
          </p>
          <a href={telLink(settings)} className="mt-4 block font-display text-2xl text-maroon-700">
            {settings.phone}
          </a>
          <a
            href={whatsappLink(settings)}
            className="mt-4 inline-block rounded-full bg-maroon-700 px-6 py-3 font-medium text-white hover:bg-maroon-600"
          >
            {t.home.whatsapp}
          </a>
        </div>

        <div>
          <h2 className="font-display text-xl text-ink-900">{t.contact.location}</h2>
          <iframe
            title={t.contact.location}
            src={`https://maps.google.com/maps?hl=${locale}&q=${encodeURIComponent(settings.mapsQuery)}&z=13&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="mt-3 aspect-video w-full rounded-2xl border border-sand-200"
          />
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="font-display text-2xl text-ink-900">{t.enquiry.title}</h2>
        <p className="mt-2 text-ink-500">{t.enquiry.subtitle}</p>
        <div className="mt-6">
          <EnquiryForm locale={locale} />
        </div>
      </section>
    </div>
  );
}
