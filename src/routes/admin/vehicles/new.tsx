import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { t } from "~/admin/strings.ts";
import { VehicleForm } from "~/admin/VehicleForm.tsx";
import { createVehicle, listAllVehicles } from "~/server/admin/vehicles.ts";

export const Route = createFileRoute("/admin/vehicles/new")({
  // Nothing is needed from the list, but it proves the session before the form
  // is rendered rather than after the owner has filled it in.
  loader: async () => {
    await listAllVehicles();
    return null;
  },
  component: NewVehiclePage,
});

function NewVehiclePage() {
  const navigate = useNavigate();

  return (
    <>
      <Link to="/admin" className="text-sm text-maroon-700 hover:underline">
        ← {t.vehicle.back}
      </Link>
      <h1 className="mt-3 mb-6 font-display text-2xl text-ink-900">{t.vehicle.newTitle}</h1>

      <VehicleForm
        slugLocked={false}
        onSubmit={async (input) => {
          const { id } = await createVehicle({ data: input });
          // Photos need a vehicle to belong to, so the form only appears after
          // the car exists.
          await navigate({ to: "/admin/vehicles/$id", params: { id } });
        }}
      />
    </>
  );
}
