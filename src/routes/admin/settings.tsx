import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { t } from "~/admin/strings.ts";
import { Card, Field, Notice, PrimaryButton, TextInput } from "~/admin/ui.tsx";
import { fetchSettingsForEdit, saveSettings } from "~/server/admin/settings.ts";

export const Route = createFileRoute("/admin/settings")({
  loader: async () => ({ settings: await fetchSettingsForEdit() }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

    setBusy(true);
    setSaved(false);
    setProblem(null);

    try {
      await saveSettings({
        data: {
          phone: text("phone"),
          whatsapp: text("whatsapp"),
          email: text("email"),
          addressLine: text("addressLine"),
          city: text("city"),
          instagram: text("instagram"),
          facebook: text("facebook"),
          mapsQuery: text("mapsQuery"),
          hours: text("hours"),
        },
      });
      await router.invalidate();
      setSaved(true);
    } catch (error) {
      console.error("Saving settings failed", error);
      setProblem(t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-2xl text-ink-900">{t.settings.title}</h1>
      <p className="mt-2 mb-6 text-sm text-ink-500">{t.settings.intro}</p>

      <form onSubmit={onSubmit} className="grid gap-5">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.settings.phone}>
              <TextInput name="phone" defaultValue={settings.phone} inputMode="tel" />
            </Field>
            <Field label={t.settings.whatsapp} hint={t.settings.whatsappHint}>
              <TextInput name="whatsapp" defaultValue={settings.whatsapp} inputMode="numeric" />
            </Field>
            <Field label={t.settings.email}>
              <TextInput name="email" defaultValue={settings.email} type="email" />
            </Field>
            <Field label={t.settings.hours} hint={t.settings.hoursHint}>
              <TextInput name="hours" defaultValue={settings.hours} />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.settings.addressLine}>
              <TextInput name="addressLine" defaultValue={settings.addressLine} />
            </Field>
            <Field label={t.settings.city}>
              <TextInput name="city" defaultValue={settings.city} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t.settings.mapsQuery}>
                <TextInput name="mapsQuery" defaultValue={settings.mapsQuery} />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.settings.instagram}>
              <TextInput name="instagram" defaultValue={settings.instagram} type="url" />
            </Field>
            <Field label={t.settings.facebook}>
              <TextInput name="facebook" defaultValue={settings.facebook} type="url" />
            </Field>
          </div>
        </Card>

        {problem ? <Notice tone="error">{problem}</Notice> : null}
        {saved ? <Notice tone="ok">{t.settings.saved}</Notice> : null}

        <div>
          <PrimaryButton disabled={busy}>
            {busy ? t.settings.saving : t.settings.save}
          </PrimaryButton>
        </div>
      </form>
    </>
  );
}
