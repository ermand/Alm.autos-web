import { createFileRoute } from "@tanstack/react-router";
import { type Locale, messagesFor } from "~/i18n/messages.ts";

const BODY: Record<Locale, string[]> = {
  en: [
    "ALM Autos is a family-run rental company in Kashar, on the edge of Tirana. We own every car on this site — there is no broker in the middle, and the person who answers the phone is the person who hands you the keys.",
    "Most of our customers are visiting Albania for a week or two and want a car that starts, has working air conditioning, and costs what they were told it would cost. That is the whole business.",
    "We can meet you at Tirana airport, or you can collect the car from our office in Kashar. Either way, ring us and we will sort it out.",
  ],
  sq: [
    "ALM Autos është një kompani familjare me qira makinash në Kashar, në periferi të Tiranës. Çdo makinë në këtë faqe është e jona — nuk ka ndërmjetës, dhe personi që përgjigjet në telefon është i njëjti që ju dorëzon çelësat.",
    "Shumica e klientëve tanë vijnë në Shqipëri për një ose dy javë dhe duan një makinë që ndizet, me kondicioner që punon, dhe që kushton aq sa u është thënë. Kjo është e gjithë puna jonë.",
    "Mund t'ju takojmë në aeroportin e Tiranës, ose mund ta merrni makinën në zyrën tonë në Kashar. Sido që të jetë, na telefononi dhe e rregullojmë.",
  ],
};

export const Route = createFileRoute("/$lang/about")({ component: AboutPage });

function AboutPage() {
  const { lang } = Route.useParams();
  const locale = lang as Locale;
  const t = messagesFor(locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl text-ink-900">{t.about.title}</h1>
      {BODY[locale].map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className="mt-5 text-ink-700">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
