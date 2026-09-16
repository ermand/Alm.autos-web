import { Link, useLocation } from "@tanstack/react-router";
import type { SiteSettings } from "~/domain/contact.ts";
import { telLink, whatsappLink } from "~/domain/contact.ts";
import { LOCALES, type Locale, messagesFor } from "~/i18n/messages.ts";
import { localePath, stripLocalePrefix } from "~/i18n/paths.ts";

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
  const swapLocale = (target: Locale) => localePath(target, stripLocalePrefix(pathname));

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to={localePath(locale)} className="flex items-center gap-2.5">
          <img
            src="/brand/logo-192.png"
            srcSet="/brand/logo-96.png 96w, /brand/logo-192.png 192w"
            sizes="40px"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          {/* The mark already says ALM; the wordmark names the company for
              anyone who has not seen it before, and for search results. */}
          <span className="font-display text-xl text-brand-500">{t.brand}</span>
        </Link>

        <nav aria-label={t.nav.home} className="ml-auto hidden gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-ink-700 transition-colors hover:text-brand-500"
              activeProps={{ className: "text-brand-500 font-medium" }}
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
                      ? "rounded px-2 py-1 font-semibold text-brand-500"
                      : "rounded px-2 py-1 text-ink-500 hover:text-brand-500"
                  }
                >
                  {option.toUpperCase()}
                </Link>
              </li>
            ))}
          </ul>

          <a
            href={whatsappLink(settings)}
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
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
            activeProps={{ className: "text-brand-500 font-medium" }}
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
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/logo-96.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              loading="lazy"
            />
            <p className="font-display text-lg text-brand-500">{t.brand}</p>
          </div>
          <p className="mt-2 text-sm text-ink-500">
            {settings.addressLine}
            <br />
            {settings.city}
          </p>
        </div>

        <div className="text-sm">
          <a href={telLink(settings)} className="block text-ink-700 hover:text-brand-500">
            {settings.phone}
          </a>
          <a href={`mailto:${settings.email}`} className="block text-ink-700 hover:text-brand-500">
            {settings.email}
          </a>
          <a
            href={whatsappLink(settings)}
            className="mt-2 inline-block text-brand-500 hover:underline"
          >
            {t.home.whatsapp}
          </a>
        </div>

        <div className="text-sm">
          {settings.instagram ? (
            <a href={settings.instagram} className="block text-ink-700 hover:text-brand-500">
              Instagram
            </a>
          ) : null}
          <Link
            to={localePath(locale, "privacy")}
            className="block text-ink-700 hover:text-brand-500"
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
