import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PhotoManager } from "~/admin/PhotoManager.tsx";
import { t } from "~/admin/strings.ts";
import { QuietButton } from "~/admin/ui.tsx";
import { VehicleForm } from "~/admin/VehicleForm.tsx";
import type { VehicleInput } from "~/domain/vehicle.ts";
import { deleteVehicle, getVehicleForEdit, updateVehicle } from "~/server/admin/vehicles.ts";

export const Route = createFileRoute("/admin/vehicles/$id")({
  loader: async ({ params }) => ({ vehicle: await getVehicleForEdit({ data: { id: params.id } }) }),
  component: EditVehiclePage,
});

function EditVehiclePage() {
  const { vehicle } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  if (!vehicle) {
    return (
      <>
        <Link to="/admin" className="text-sm text-brand-500 hover:underline">
          ← {t.vehicle.back}
        </Link>
        <p className="mt-6 text-ink-700">{t.genericError}</p>
      </>
    );
  }

  const initial: VehicleInput = {
    slug: vehicle.slug,
    model: vehicle.model,
    year: vehicle.year,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    bodyType: vehicle.bodyType,
    seats: vehicle.seats,
    doors: vehicle.doors,
    airConditioning: vehicle.airConditioning,
    descriptionEn: vehicle.descriptionEn,
    descriptionSq: vehicle.descriptionSq,
    status: vehicle.status,
    featured: vehicle.featured,
    baseRates: vehicle.baseRates,
  };

  async function onDelete() {
    if (!vehicle) return;
    if (!window.confirm(t.vehicle.deleteConfirm)) return;

    setDeleting(true);
    try {
      await deleteVehicle({ data: { id: vehicle.id } });
      await navigate({ to: "/admin" });
    } catch (error) {
      console.error("Deleting the vehicle failed", error);
      setDeleting(false);
    }
  }

  return (
    <>
      <Link to="/admin" className="text-sm text-brand-500 hover:underline">
        ← {t.vehicle.back}
      </Link>
      <h1 className="mt-3 mb-6 font-display text-2xl text-ink-900">
        {vehicle.model} <span className="text-ink-500">{vehicle.year}</span>
      </h1>

      <div className="grid gap-5">
        <PhotoManager vehicleId={vehicle.id} photos={vehicle.photos} />

        <VehicleForm
          initial={initial}
          slugLocked={vehicle.status === "published"}
          onSubmit={async (input) => {
            await updateVehicle({ data: { id: vehicle.id, input } });
            await router.invalidate();
          }}
        />

        <div className="pt-4">
          <QuietButton danger onClick={onDelete} disabled={deleting}>
            {t.vehicle.delete}
          </QuietButton>
        </div>
      </div>
    </>
  );
}
