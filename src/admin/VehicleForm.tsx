import { type FormEvent, useState } from "react";
import { t } from "~/admin/strings.ts";
import {
  Card,
  Checkbox,
  Field,
  Notice,
  PrimaryButton,
  SectionHeading,
  Select,
  TextArea,
  TextInput,
} from "~/admin/ui.tsx";
import { TIERS, type Tier } from "~/domain/pricing.ts";
import {
  BODY_TYPES,
  FUELS,
  suggestSlug,
  TRANSMISSIONS,
  VEHICLE_STATUSES,
  type VehicleInput,
} from "~/domain/vehicle.ts";

interface Props {
  initial?: VehicleInput;
  /** A published vehicle's slug is frozen: search engines already point at it. */
  slugLocked: boolean;
  onSubmit: (input: VehicleInput) => Promise<void>;
}

/** Euro cents from a text field, tolerating "30", "30.5" and "30,50". */
function centsFrom(value: string): number {
  const normalised = value.replace(",", ".").trim();
  const euros = Number.parseFloat(normalised);
  if (!Number.isFinite(euros) || euros < 0) return 0;
  return Math.round(euros * 100);
}

function eurosFrom(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalChoice<T extends string>(
  value: FormDataEntryValue | null,
  allowed: readonly T[],
): T | null {
  const text = String(value ?? "");
  return (allowed as readonly string[]).includes(text) ? (text as T) : null;
}

export function VehicleForm({ initial, slugLocked, onSubmit }: Props) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

    const model = text("model");
    const year = Number.parseInt(text("year"), 10);

    const baseRates = Object.fromEntries(
      TIERS.map((tier) => [tier, centsFrom(text(`rate-${tier}`))]),
    ) as Record<Tier, number>;

    // A blank slug field means "use the obvious one", which is what the owner
    // expects when adding a car.
    const slug = text("slug") || suggestSlug(model, year);

    const input: VehicleInput = {
      slug,
      model,
      year,
      transmission: optionalChoice(form.get("transmission"), TRANSMISSIONS),
      fuel: optionalChoice(form.get("fuel"), FUELS),
      bodyType: optionalChoice(form.get("bodyType"), BODY_TYPES),
      seats: optionalNumber(form.get("seats")),
      doors: optionalNumber(form.get("doors")),
      airConditioning: text("airConditioning") === "" ? null : text("airConditioning") === "yes",
      descriptionSq: text("descriptionSq") || null,
      descriptionEn: text("descriptionEn") || null,
      status: optionalChoice(form.get("status"), VEHICLE_STATUSES) ?? "hidden",
      featured: form.get("featured") === "on",
      baseRates,
    };

    setBusy(true);
    setProblem(null);
    setSaved(false);

    try {
      await onSubmit(input);
      setSaved(true);
    } catch (error) {
      console.error("Saving the vehicle failed", error);
      setProblem(error instanceof Error ? error.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.vehicle.model} hint={t.vehicle.modelHint}>
            <TextInput name="model" defaultValue={initial?.model} required />
          </Field>

          <Field label={t.vehicle.year}>
            <TextInput
              name="year"
              type="number"
              inputMode="numeric"
              min={1950}
              max={new Date().getUTCFullYear() + 1}
              defaultValue={initial?.year}
              required
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label={t.vehicle.slug}
              hint={slugLocked ? t.vehicle.slugLocked : t.vehicle.slugHint}
            >
              <TextInput name="slug" defaultValue={initial?.slug} disabled={slugLocked} />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading title={t.vehicle.prices} hint={t.vehicle.pricesHint} />
        <div className="grid gap-4 sm:grid-cols-4">
          {TIERS.map((tier) => (
            <Field key={tier} label={`${tier} ${t.vehicle.days}`}>
              <TextInput
                name={`rate-${tier}`}
                type="text"
                inputMode="decimal"
                defaultValue={initial ? eurosFrom(initial.baseRates[tier]) : ""}
                required
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeading title={t.vehicle.specs} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.vehicle.transmission}>
            <Select
              name="transmission"
              defaultValue={initial?.transmission ?? ""}
              emptyLabel={t.vehicle.unknown}
              options={TRANSMISSIONS.map((value) => ({ value, label: t.transmission[value] }))}
            />
          </Field>

          <Field label={t.vehicle.fuel}>
            <Select
              name="fuel"
              defaultValue={initial?.fuel ?? ""}
              emptyLabel={t.vehicle.unknown}
              options={FUELS.map((value) => ({ value, label: t.fuel[value] }))}
            />
          </Field>

          <Field label={t.vehicle.bodyType}>
            <Select
              name="bodyType"
              defaultValue={initial?.bodyType ?? ""}
              emptyLabel={t.vehicle.unknown}
              options={BODY_TYPES.map((value) => ({ value, label: t.bodyType[value] }))}
            />
          </Field>

          <Field label={t.vehicle.airConditioning}>
            <Select
              name="airConditioning"
              defaultValue={
                initial?.airConditioning === null || initial?.airConditioning === undefined
                  ? ""
                  : initial.airConditioning
                    ? "yes"
                    : "no"
              }
              emptyLabel={t.vehicle.unknown}
              options={[
                { value: "yes", label: "Po" },
                { value: "no", label: "Jo" },
              ]}
            />
          </Field>

          <Field label={t.vehicle.seats}>
            <TextInput
              name="seats"
              type="number"
              inputMode="numeric"
              min={1}
              max={9}
              defaultValue={initial?.seats ?? undefined}
            />
          </Field>

          <Field label={t.vehicle.doors}>
            <TextInput
              name="doors"
              type="number"
              inputMode="numeric"
              min={2}
              max={6}
              defaultValue={initial?.doors ?? undefined}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="grid gap-4">
          <Field label={t.vehicle.descriptionSq}>
            <TextArea name="descriptionSq" defaultValue={initial?.descriptionSq ?? ""} />
          </Field>
          <Field label={t.vehicle.descriptionEn}>
            <TextArea name="descriptionEn" defaultValue={initial?.descriptionEn ?? ""} />
          </Field>
        </div>
      </Card>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.vehicle.status}>
            <Select
              name="status"
              defaultValue={initial?.status ?? "hidden"}
              options={VEHICLE_STATUSES.map((value) => ({ value, label: t.status[value] }))}
            />
          </Field>
          <div className="self-end">
            <Checkbox
              name="featured"
              label={t.vehicle.featured}
              defaultChecked={initial?.featured}
            />
          </div>
        </div>
      </Card>

      {problem ? <Notice tone="error">{problem}</Notice> : null}
      {saved ? <Notice tone="ok">{t.vehicle.saved}</Notice> : null}

      <div>
        <PrimaryButton disabled={busy}>{busy ? t.vehicle.saving : t.vehicle.save}</PrimaryButton>
      </div>
    </form>
  );
}
