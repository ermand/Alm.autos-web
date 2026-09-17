import { createFileRoute, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { t } from "~/admin/strings.ts";
import { Card, Field, Notice, PrimaryButton, SectionHeading, TextInput } from "~/admin/ui.tsx";
import {
  type AccountErrorCode,
  EMAIL_FIELD_ORDER,
  type EmailErrors,
  firstInvalid,
  PASSWORD_FIELD_ORDER,
  type PasswordErrors,
  validateEmailChange,
  validatePasswordChange,
} from "~/domain/account.ts";
import { changeEmail, changePassword, fetchProfile } from "~/server/admin/profile.ts";

export const Route = createFileRoute("/admin/profile")({
  loader: async () => ({ profile: await fetchProfile() }),
  component: ProfilePage,
});

function message(code: AccountErrorCode | undefined): string | undefined {
  return code ? t.profile.errors[code] : undefined;
}

function ProfilePage() {
  const { profile } = Route.useLoaderData();

  return (
    <>
      <h1 className="font-display text-2xl text-ink-900">{t.profile.title}</h1>
      <p className="mt-2 text-sm text-ink-500">{t.profile.intro}</p>
      <p className="mt-1 text-sm text-ink-700">
        {t.profile.signedInAs} <strong className="font-medium">{profile.email}</strong>
      </p>

      <div className="mt-6 grid gap-5">
        <EmailForm currentEmail={profile.email} />
        <PasswordForm />
      </div>
    </>
  );
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<EmailErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "");
    const currentPassword = String(data.get("currentPassword") ?? "");

    const found = validateEmailChange({ email, currentPassword, existingEmail: currentEmail });
    setErrors(found);
    setDone(false);

    const firstBad = firstInvalid(EMAIL_FIELD_ORDER, found);
    if (firstBad) {
      setFailure(t.profile.errors.invalid);
      form.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    setBusy(true);
    setFailure(null);

    try {
      const result = await changeEmail({ data: { email, currentPassword } });
      if (!result.ok) {
        setFailure(t.profile.errors[result.reason]);
        return;
      }
      // The header and this page both show the address, so reload both.
      await router.invalidate();
      form.reset();
      setDone(true);
    } catch (error) {
      console.error("Changing the admin email failed", error);
      setFailure(t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHeading title={t.profile.emailTitle} hint={t.profile.emailHint} />
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label={t.profile.newEmail} error={message(errors.email)}>
          <TextInput
            name="email"
            type="email"
            autoComplete="email"
            invalid={Boolean(errors.email)}
          />
        </Field>

        <Field label={t.profile.currentPassword} error={message(errors.currentPassword)}>
          <TextInput
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(errors.currentPassword)}
          />
        </Field>

        <p className="text-xs text-ink-500">{t.profile.whyPassword}</p>

        {failure ? <Notice tone="error">{failure}</Notice> : null}
        {done ? <Notice tone="ok">{t.profile.emailSaved}</Notice> : null}

        <div>
          <PrimaryButton disabled={busy}>{busy ? t.profile.saving : t.profile.save}</PrimaryButton>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      currentPassword: String(data.get("currentPassword") ?? ""),
      newPassword: String(data.get("newPassword") ?? ""),
      confirmPassword: String(data.get("confirmPassword") ?? ""),
    };

    const found = validatePasswordChange(input);
    setErrors(found);
    setDone(null);

    const firstBad = firstInvalid(PASSWORD_FIELD_ORDER, found);
    if (firstBad) {
      setFailure(t.profile.errors.invalid);
      form.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    setBusy(true);
    setFailure(null);

    try {
      const result = await changePassword({ data: input });
      if (!result.ok) {
        setFailure(t.profile.errors[result.reason]);
        return;
      }
      form.reset();
      setDone(
        result.signedOutElsewhere
          ? `${t.profile.passwordSaved} ${t.profile.signedOutElsewhere}`
          : t.profile.passwordSaved,
      );
    } catch (error) {
      console.error("Changing the admin password failed", error);
      setFailure(t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionHeading title={t.profile.passwordTitle} hint={t.profile.passwordHint} />
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label={t.profile.currentPassword} error={message(errors.currentPassword)}>
          <TextInput
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(errors.currentPassword)}
          />
        </Field>

        <Field label={t.profile.newPassword} error={message(errors.newPassword)}>
          <TextInput
            name="newPassword"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.newPassword)}
          />
        </Field>

        <Field label={t.profile.confirmPassword} error={message(errors.confirmPassword)}>
          <TextInput
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.confirmPassword)}
          />
        </Field>

        {failure ? <Notice tone="error">{failure}</Notice> : null}
        {done ? <Notice tone="ok">{done}</Notice> : null}

        <div>
          <PrimaryButton disabled={busy}>{busy ? t.profile.saving : t.profile.save}</PrimaryButton>
        </div>
      </form>
    </Card>
  );
}
