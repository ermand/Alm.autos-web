import { Link, useParams, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, messagesFor } from "~/i18n/messages.ts";
import { localePath } from "~/i18n/paths.ts";

/**
 * The three states every route needs and none of them had.
 *
 * Without these the router falls back to a bare "Not Found" paragraph on any
 * mistyped URL, and to an unstyled error overlay when a loader throws — both of
 * which a visitor reads as a broken site rather than a wrong address.
 */

/** These render outside the /$lang layout, so the locale comes from the URL. */
function useUrlLocale() {
  const params = useParams({ strict: false }) as { lang?: string };
  return params.lang && isLocale(params.lang) ? params.lang : DEFAULT_LOCALE;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16 text-center">
      {children}
    </div>
  );
}

export function NotFoundState() {
  const locale = useUrlLocale();
  const t = messagesFor(locale);

  return (
    <Centered>
      {/* A page that failed to load is a status change, not decoration. */}
      <p role="status" className="font-display text-6xl text-brand-200">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl text-ink-900">{t.notFound.title}</h1>
      <p className="mt-3 text-ink-500">{t.notFound.body}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to={localePath(locale, "cars")}
          className="rounded-full bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600"
        >
          {t.notFound.seeCars}
        </Link>
        <Link
          to={localePath(locale)}
          className="rounded-full border border-sand-200 px-6 py-3 font-medium text-ink-700 transition-colors hover:border-brand-400"
        >
          {t.notFound.home}
        </Link>
      </div>
    </Centered>
  );
}

export function ErrorState() {
  const locale = useUrlLocale();
  const t = messagesFor(locale);
  const router = useRouter();

  return (
    <Centered>
      <h1 className="font-display text-2xl text-ink-900">{t.errorState.title}</h1>
      <p className="mt-3 text-ink-500">{t.errorState.body}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => router.invalidate()}
          className="rounded-full bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600"
        >
          {t.errorState.retry}
        </button>
        <Link
          to={localePath(locale)}
          className="rounded-full border border-sand-200 px-6 py-3 font-medium text-ink-700 transition-colors hover:border-brand-400"
        >
          {t.notFound.home}
        </Link>
      </div>
    </Centered>
  );
}

/**
 * Shown only when a navigation takes longer than the router's threshold. It
 * mirrors the fleet grid rather than spinning, so the page does not jump when
 * the real content arrives.
 */
export function PendingState() {
  const locale = useUrlLocale();
  const t = messagesFor(locale);

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t.loading}
      className="mx-auto max-w-6xl px-4 py-12"
    >
      <div className="h-9 w-56 animate-pulse rounded-lg bg-sand-200" />
      <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded-lg bg-sand-100" />

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => index).map((index) => (
          <li key={index} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <div className="aspect-[4/3] animate-pulse bg-sand-100" />
            <div className="space-y-2 p-4">
              <div className="h-5 w-2/3 animate-pulse rounded bg-sand-100" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-sand-100" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
