import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { t } from "~/admin/strings.ts";
import {
  Card,
  Field,
  Notice,
  PrimaryButton,
  QuietButton,
  SectionHeading,
  Select,
  TextInput,
} from "~/admin/ui.tsx";
import { deleteSeason, listSeasonsForEdit, saveSeason } from "~/server/admin/seasons.ts";

export const Route = createFileRoute("/admin/seasons")({
  loader: async () => ({ seasons: await listSeasonsForEdit() }),
  component: SeasonsPage,
});

const MONTH_OPTIONS = t.months.map((label, index) => ({ value: String(index + 1), label }));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));

function SeasonsPage() {
  const { seasons } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    setProblem(null);
    try {
      await work();
      await router.invalidate();
    } catch (error) {
      console.error("Season update failed", error);
      setProblem(error instanceof Error ? error.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>, id: string | null) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const num = (key: string) => Number(form.get(key));

    return run(() =>
      saveSeason({
        data: {
          id,
          input: {
            name: String(form.get("name") ?? "").trim(),
            from: { month: num("fromMonth"), day: num("fromDay") },
            to: { month: num("toMonth"), day: num("toDay") },
            multiplier: Number(String(form.get("multiplier") ?? "1").replace(",", ".")),
            position: num("position"),
          },
        },
      }),
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl text-ink-900">{t.seasons.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">{t.seasons.intro}</p>
      <p className="mt-1 max-w-2xl text-sm text-ink-500">{t.seasons.overlapNote}</p>

      {problem ? (
        <div className="mt-4">
          <Notice tone="error">{problem}</Notice>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        {seasons.length === 0 ? <Notice tone="ok">{t.seasons.empty}</Notice> : null}

        {seasons.map((season, index) => (
          <Card key={season.id}>
            <form onSubmit={(event) => onSubmit(event, season.id)} className="grid gap-4">
              <SeasonFields
                defaults={{
                  name: season.name,
                  fromMonth: season.fromMonth,
                  fromDay: season.fromDay,
                  toMonth: season.toMonth,
                  toDay: season.toDay,
                  multiplier: season.multiplier,
                  position: index,
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton disabled={busy}>{t.seasons.save}</PrimaryButton>
                <QuietButton
                  danger
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(t.seasons.deleteConfirm)) {
                      void run(() => deleteSeason({ data: { id: season.id } }));
                    }
                  }}
                >
                  {t.seasons.delete}
                </QuietButton>
              </div>
            </form>
          </Card>
        ))}

        <Card>
          <SectionHeading title={t.seasons.add} />
          <form onSubmit={(event) => onSubmit(event, null)} className="grid gap-4">
            <SeasonFields
              defaults={{
                name: "",
                fromMonth: 7,
                fromDay: 1,
                toMonth: 8,
                toDay: 31,
                multiplier: 1.3,
                position: seasons.length,
              }}
            />
            <div>
              <PrimaryButton disabled={busy}>{t.seasons.add}</PrimaryButton>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

interface SeasonDefaults {
  name: string;
  fromMonth: number;
  fromDay: number;
  toMonth: number;
  toDay: number;
  multiplier: number;
  position: number;
}

function SeasonFields({ defaults }: { defaults: SeasonDefaults }) {
  // The field is the source of truth; the slider writes into it, so the preview
  // can never show a number different from the one that gets saved.
  const [multiplierText, setMultiplierText] = useState(String(defaults.multiplier));
  const multiplier = Number(multiplierText.replace(",", "."));
  const example = Number.isFinite(multiplier) ? Math.round(30 * multiplier * 100) / 100 : null;

  return (
    <>
      <input type="hidden" name="position" value={defaults.position} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.seasons.name}>
          <TextInput name="name" defaultValue={defaults.name} required />
        </Field>

        <Field label={t.seasons.multiplier} hint={t.seasons.multiplierHint}>
          <input
            name="multiplier"
            type="text"
            inputMode="decimal"
            value={multiplierText}
            onChange={(event) => setMultiplierText(event.target.value)}
            className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-ink-900"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.seasons.from}>
          <div className="flex gap-2">
            <Select name="fromDay" defaultValue={String(defaults.fromDay)} options={DAY_OPTIONS} />
            <Select
              name="fromMonth"
              defaultValue={String(defaults.fromMonth)}
              options={MONTH_OPTIONS}
            />
          </div>
        </Field>

        <Field label={t.seasons.to}>
          <div className="flex gap-2">
            <Select name="toDay" defaultValue={String(defaults.toDay)} options={DAY_OPTIONS} />
            <Select
              name="toMonth"
              defaultValue={String(defaults.toMonth)}
              options={MONTH_OPTIONS}
            />
          </div>
        </Field>
      </div>

      {/* A multiplier is abstract; showing what it does to a real price is not. */}
      <p className="text-sm text-ink-500" aria-live="polite">
        {t.seasons.example}{" "}
        <strong className="text-ink-900">{example === null ? "—" : `${example} €/ditë`}</strong>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={Number.isFinite(multiplier) ? multiplier : 1}
          onChange={(event) => setMultiplierText(event.target.value)}
          className="ml-3 w-40 align-middle accent-maroon-700"
          aria-label={t.seasons.multiplier}
        />
      </p>
    </>
  );
}
