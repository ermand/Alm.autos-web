import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { t } from "~/admin/strings.ts";
import { adminLogin } from "~/server/admin/session.ts";

export const Route = createFileRoute("/admin/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setProblem(null);

    try {
      const result = await adminLogin({
        data: {
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        },
      });

      if (!result.ok) {
        setProblem(result.reason === "throttled" ? t.login.throttled : t.login.invalid);
        return;
      }

      await router.invalidate();
      await navigate({ to: "/admin" });
    } catch (error) {
      console.error("Admin login failed", error);
      setProblem(t.login.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl text-ink-900">{t.login.title}</h1>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm text-ink-700">{t.login.email}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="rounded-xl border border-sand-200 bg-white px-3 py-2"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-ink-700">{t.login.password}</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-sand-200 bg-white px-3 py-2"
          />
        </label>

        {problem ? (
          <p role="alert" className="text-sm text-brand-600">
            {problem}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? t.login.working : t.login.submit}
        </button>
      </form>
    </div>
  );
}
