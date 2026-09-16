import { createFileRoute } from "@tanstack/react-router";
import { type Locale, messagesFor } from "~/i18n/messages.ts";
import { fetchSettings } from "~/server/functions.ts";

/** Enquiries hold personal data, so this page is a launch requirement, not a nicety. */
const SECTIONS: Record<Locale, { heading: string; body: string }[]> = {
  en: [
    {
      heading: "What we collect",
      body: "When you send an enquiry we collect your name, email address, phone number, the dates you asked about and anything you write in the message. We do not collect anything else, and the site sets no tracking or advertising cookies.",
    },
    {
      heading: "Why we collect it",
      body: "Solely to answer your enquiry about renting a car. We do not sell it, share it with anyone, or send marketing.",
    },
    {
      heading: "How long we keep it",
      body: "Enquiries are deleted automatically twelve months after you send them.",
    },
    {
      heading: "Analytics",
      body: "We count page visits using self-hosted, cookieless analytics. No personal data is collected and no visitor is identified or tracked across sites.",
    },
    {
      heading: "Your rights",
      body: "You can ask us for a copy of your data, or ask us to delete it, by emailing the address below. We will act within 30 days.",
    },
  ],
  sq: [
    {
      heading: "Çfarë mbledhim",
      body: "Kur dërgoni një kërkesë, mbledhim emrin, email-in, numrin e telefonit, datat që kërkoni dhe çdo gjë që shkruani në mesazh. Nuk mbledhim asgjë tjetër dhe faqja nuk vendos cookie gjurmimi ose reklamash.",
    },
    {
      heading: "Pse i mbledhim",
      body: "Vetëm për t'iu përgjigjur kërkesës suaj për një makinë me qira. Nuk i shesim, nuk i ndajmë me askënd dhe nuk dërgojmë reklama.",
    },
    {
      heading: "Sa kohë i mbajmë",
      body: "Kërkesat fshihen automatikisht dymbëdhjetë muaj pasi i dërgoni.",
    },
    {
      heading: "Statistikat",
      body: "Numërojmë vizitat me një sistem statistikash të vetë-strehuar, pa cookie. Nuk mblidhen të dhëna personale dhe asnjë vizitor nuk identifikohet.",
    },
    {
      heading: "Të drejtat tuaja",
      body: "Mund të na kërkoni një kopje të të dhënave tuaja, ose fshirjen e tyre, duke shkruar në adresën më poshtë. Veprojmë brenda 30 ditëve.",
    },
  ],
};

export const Route = createFileRoute("/$lang/privacy")({
  loader: async () => ({ settings: await fetchSettings() }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { lang } = Route.useParams();
  const locale = lang as Locale;
  const { settings } = Route.useLoaderData();
  const t = messagesFor(locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl text-ink-900">{t.privacy.title}</h1>

      {SECTIONS[locale].map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="font-display text-xl text-ink-900">{section.heading}</h2>
          <p className="mt-2 text-ink-700">{section.body}</p>
        </section>
      ))}

      <p className="mt-10 text-ink-700">
        <a href={`mailto:${settings.email}`} className="text-maroon-700 hover:underline">
          {settings.email}
        </a>
      </p>
    </div>
  );
}
