import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { t } from "~/admin/strings.ts";
import { Notice, QuietButton } from "~/admin/ui.tsx";
import { formatEuros } from "~/domain/money.ts";
import { photoSrc } from "~/domain/photos.ts";
import { fromPriceCents } from "~/domain/pricing.ts";
import { listAllVehicles, reorderVehicles } from "~/server/admin/vehicles.ts";

export const Route = createFileRoute("/admin/")({
  loader: async () => ({ vehicles: await listAllVehicles() }),
  component: VehiclesPage,
});

function VehiclesPage() {
  const { vehicles } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /**
   * Up/down buttons rather than drag-and-drop: this is used one-handed on a
   * phone, where dragging a row inside a scrolling list is genuinely hard.
   */
  async function move(index: number, direction: -1 | 1) {
    const next = [...vehicles];
    const target = index + direction;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;

    next[index] = b;
    next[target] = a;

    setBusy(true);
    setProblem(null);
    try {
      await reorderVehicles({ data: { ids: next.map((vehicle) => vehicle.id) } });
      await router.invalidate();
    } catch (error) {
      console.error("Reordering the fleet failed", error);
      setProblem(t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink-900">{t.vehicles.title}</h1>
        <Link
          to="/admin/vehicles/new"
          className="rounded-full bg-maroon-700 px-5 py-2.5 font-medium text-white hover:bg-maroon-600"
        >
          {t.vehicles.add}
        </Link>
      </div>

      {problem ? (
        <div className="mb-4">
          <Notice tone="error">{problem}</Notice>
        </div>
      ) : null}

      {vehicles.length === 0 ? (
        <Notice tone="ok">{t.vehicles.empty}</Notice>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-500">{t.vehicles.order}</p>
          <ul className="grid gap-3">
            {vehicles.map((vehicle, index) => {
              const photo = vehicle.photos[0];
              return (
                <li
                  key={vehicle.id}
                  className="flex items-center gap-4 rounded-2xl border border-sand-200 bg-white p-3"
                >
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-100">
                    {photo ? (
                      <img
                        src={photoSrc(photo.path, 400)}
                        alt=""
                        width={96}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-ink-500">
                        {t.vehicles.noPhoto}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      to="/admin/vehicles/$id"
                      params={{ id: vehicle.id }}
                      className="font-medium text-ink-900 hover:text-maroon-700"
                    >
                      {vehicle.model}
                    </Link>
                    <p className="text-sm text-ink-500">
                      {vehicle.year} · {formatEuros(fromPriceCents(vehicle.baseRates), "sq")}
                      {vehicle.featured ? ` · ${t.vehicles.featured}` : ""}
                    </p>
                    <p className="text-xs text-ink-500">{t.status[vehicle.status]}</p>
                  </div>

                  <div className="flex shrink-0 flex-col gap-1">
                    <QuietButton onClick={() => move(index, -1)} disabled={busy || index === 0}>
                      ↑<span className="sr-only"> {t.vehicles.moveUp}</span>
                    </QuietButton>
                    <QuietButton
                      onClick={() => move(index, 1)}
                      disabled={busy || index === vehicles.length - 1}
                    >
                      ↓<span className="sr-only"> {t.vehicles.moveDown}</span>
                    </QuietButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
