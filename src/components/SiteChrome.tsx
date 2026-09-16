import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  // Navigating closes the menu; leaving it open over the new page is the most
  // common mobile-menu bug.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closing is keyed to the path, not the setter.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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
          {/* The mark already says ALM, so below 640px it carries the name on
              its own and the wordmark would only cost the header its room. */}
          <span className="hidden font-display text-xl text-brand-500 sm:inline">{t.brand}</span>
        </Link>

        <nav aria-label={t.nav.mainNav} className="ml-auto hidden gap-6 md:flex">
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
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            className="-ml-1 rounded-full p-2.5 text-ink-700 hover:bg-sand-100 md:hidden"
          >
            {/* Two bars that become an X: the state is visible, not just announced. */}
            <span aria-hidden="true" className="relative block h-4 w-5">
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
                  menuOpen ? "top-1.5 rotate-45" : "top-0.5"
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-5 bg-current transition-transform ${
                  menuOpen ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>

          <ul className="hidden items-center gap-1 text-xs md:flex" aria-label={t.nav.language}>
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

      {/*
        A disclosure panel rather than the horizontal scroll strip this used to
        be: a row that scrolls sideways hides its own overflow, so on a narrow
        phone "Contact" simply was not visible and nothing said it was there.
      */}
      <nav
        id={menuId}
        aria-label={t.nav.mainNav}
        hidden={!menuOpen}
        className="border-t border-sand-200 md:hidden"
      >
        <ul className="px-2 py-2">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className="block rounded-xl px-4 py-3 text-base text-ink-700 hover:bg-sand-100"
                activeProps={{ className: "text-brand-500 font-medium bg-sand-100" }}
                activeOptions={{ exact: link.to === localePath(locale) }}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li className="mt-1 border-t border-sand-200 pt-2">
            <a
              href={telLink(settings)}
              className="block rounded-xl px-4 py-3 font-display text-lg text-brand-500"
            >
              {settings.phone}
            </a>
          </li>
          <li className="px-4 py-2">
            <ul className="flex items-center gap-2 text-sm" aria-label={t.nav.language}>
              {LOCALES.map((option) => (
                <li key={option}>
                  <Link
                    to={swapLocale(option)}
                    aria-current={option === locale ? "true" : undefined}
                    className={
                      option === locale
                        ? "rounded-lg bg-sand-100 px-3 py-1.5 font-semibold text-brand-500"
                        : "rounded-lg px-3 py-1.5 text-ink-500"
                    }
                  >
                    {option.toUpperCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
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
