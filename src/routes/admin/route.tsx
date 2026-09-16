import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { t } from "~/admin/strings.ts";
import { adminLogout, fetchCurrentAdmin } from "~/server/admin/session.ts";

/**
 * Admin chrome. The guard is deliberately not here: each protected route's
 * loader calls a server function that requires a session, so the data is what
 * is protected rather than only the page. The login page lives under this
 * layout and must stay reachable.
 */
export const Route = createFileRoute("/admin")({
  loader: async () => ({ admin: await fetchCurrentAdmin() }),
  head: () => ({
    meta: [{ title: "Paneli — ALM Autos" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { admin } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();

  async function onLogout() {
    await adminLogout();
    await router.invalidate();
    await navigate({ to: "/admin/login" });
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="border-b border-sand-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <span className="font-display text-lg text-maroon-700">
            {t.brand} <span className="text-ink-500">{t.admin}</span>
          </span>

          {admin ? (
            <>
              <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <Link
                  to="/admin"
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "text-maroon-700 font-medium" }}
                  className="text-ink-700 hover:text-maroon-700"
                >
                  {t.nav.vehicles}
                </Link>
                <Link
                  to="/admin/seasons"
                  activeProps={{ className: "text-maroon-700 font-medium" }}
                  className="text-ink-700 hover:text-maroon-700"
                >
                  {t.nav.seasons}
                </Link>
                <Link
                  to="/admin/enquiries"
                  activeProps={{ className: "text-maroon-700 font-medium" }}
                  className="text-ink-700 hover:text-maroon-700"
                >
                  {t.nav.enquiries}
                </Link>
                <Link
                  to="/admin/settings"
                  activeProps={{ className: "text-maroon-700 font-medium" }}
                  className="text-ink-700 hover:text-maroon-700"
                >
                  {t.nav.settings}
                </Link>
              </nav>

              <div className="ml-auto flex items-center gap-4 text-sm">
                <a href="/sq" className="text-ink-500 hover:text-maroon-700">
                  {t.nav.viewSite}
                </a>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full border border-sand-200 px-3 py-1.5 text-ink-700 hover:border-maroon-400"
                >
                  {t.nav.logout}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
