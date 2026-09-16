import { Link, useLocation } from "@tanstack/react-router";
import { LOCALES, type Locale, messagesFor } from "~/i18n/messages.ts";
import { localePath } from "~/i18n/paths.ts";
import type { SiteSettings } from "~/server/settings.ts";
import { telLink, whatsappLink } from "~/server/settings.ts";

interface ChromeProps {
  locale: Locale;
  settings: SiteSettings;
}

export function SiteHeader({ locale, settings }: ChromeProps) {
  const t = messagesFor(locale);
  const { pathname } = useLocation();

  const links = [
    { to: localePath(locale), label: t.nav.home },
    { to: localePath(locale, "cars"), label: t.nav.fleet },
    { to: localePath(locale, "about"), label: t.nav.about },
    { to: localePath(locale, "contact"), label: t.nav.contact },
  ];

  // Swapping language keeps you on the same page, which is the whole point of
  // prefixed paths.
  const swapLocale = (target: Locale) => {
    const rest = pathname.replace(/^\/(en|sq)/, "");
    return `/${target}${rest}`;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to={localePath(locale)} className="font-display text-xl text-maroon-700">
          {t.brand}
        </Link>

        <nav aria-label={t.nav.home} className="ml-auto hidden gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-ink-700 transition-colors hover:text-maroon-700"
              activeProps={{ className: "text-maroon-700 font-medium" }}
              activeOptions={{ exact: link.to === localePath(locale) }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ul className="flex items-center gap-1 text-xs" aria-label="Language">
            {LOCALES.map((option) => (
              <li key={option}>
                <Link
                  to={swapLocale(option)}
                  aria-current={option === locale ? "true" : undefined}
                  className={
                    option === locale
                      ? "rounded px-2 py-1 font-semibold text-maroon-700"
                      : "rounded px-2 py-1 text-ink-500 hover:text-maroon-700"
                  }
                >
                  {option.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>

          <a
            href={whatsappLink(settings)}
            className="rounded-full bg-maroon-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-maroon-600"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <nav aria-label={t.nav.fleet} className="flex gap-4 overflow-x-auto px-4 pb-2 md:hidden">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="whitespace-nowrap text-sm text-ink-700"
            activeProps={{ className: "text-maroon-700 font-medium" }}
            activeOptions={{ exact: link.to === localePath(locale) }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter({ locale, settings }: ChromeProps) {
  const t = messagesFor(locale);

  return (
    <footer className="mt-20 border-t border-sand-200 bg-sand-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg text-maroon-700">{t.brand}</p>
          <p className="mt-2 text-sm text-ink-500">
            {settings.addressLine}
            <br />
            {settings.city}
          </p>
        </div>

        <div className="text-sm">
          <a href={telLink(settings)} className="block text-ink-700 hover:text-maroon-700">
            {settings.phone}
          </a>
          <a href={`mailto:${settings.email}`} className="block text-ink-700 hover:text-maroon-700">
            {settings.email}
          </a>
          <a
            href={whatsappLink(settings)}
            className="mt-2 inline-block text-maroon-700 hover:underline"
          >
            {t.home.whatsapp}
          </a>
        </div>

        <div className="text-sm">
          {settings.instagram ? (
            <a href={settings.instagram} className="block text-ink-700 hover:text-maroon-700">
              Instagram
            </a>
          ) : null}
          <Link
            to={localePath(locale, "privacy")}
            className="block text-ink-700 hover:text-maroon-700"
          >
            {t.footer.privacy}
          </Link>
        </div>
      </div>

      <p className="border-t border-sand-200 px-4 py-4 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} {t.brand}. {t.footer.rights}.
      </p>
    </footer>
  );
}
