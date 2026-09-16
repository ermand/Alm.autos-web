import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "~/components/SiteChrome.tsx";
import { isLocale, type Locale } from "~/i18n/messages.ts";
import { fetchSettings } from "~/server/functions.ts";

export const Route = createFileRoute("/$lang")({
  // An unknown prefix is a 404, not a silent fallback to English: a typo should
  // not quietly serve the wrong language under the wrong URL.
  beforeLoad: ({ params }) => {
    if (!isLocale(params.lang)) throw notFound();
  },
  loader: async () => ({ settings: await fetchSettings() }),
  component: LocaleLayout,
});

function LocaleLayout() {
  const { lang } = Route.useParams();
  const { settings } = Route.useLoaderData();
  const locale = lang as Locale;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} settings={settings} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter locale={locale} settings={settings} />
    </div>
  );
}
