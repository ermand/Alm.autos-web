import { type FormEvent, useState } from "react";
import { type Locale, messagesFor } from "~/i18n/messages.ts";
import { submitEnquiry } from "~/server/enquiries.ts";

interface Props {
  locale: Locale;
  vehicleSlug?: string;
}

type State = "idle" | "sending" | "sent" | "error";

export function EnquiryForm({ locale, vehicleSlug }: Props) {
  const t = messagesFor(locale);
  const [state, setState] = useState<State>("idle");
  const [problem, setProblem] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

    if (!text("name") || !text("email") || !text("phone")) {
      setProblem(t.enquiry.required);
      setState("error");
      return;
    }

    setState("sending");
    setProblem(null);

    try {
      await submitEnquiry({
        data: {
          name: text("name"),
          email: text("email"),
          phone: text("phone"),
          pickupDate: text("pickupDate") || null,
          dropoffDate: text("dropoffDate") || null,
          message: text("message") || null,
          vehicleSlug: vehicleSlug ?? null,
          locale,
        },
      });
      setState("sent");
    } catch (error) {
      // The visitor gets the phone and WhatsApp fallback; the cause still has
      // to reach somewhere a human can read it.
      console.error("Enquiry submission failed", error);
      setProblem(t.enquiry.error);
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p role="status" className="rounded-2xl bg-maroon-50 p-6 text-ink-900">
        {t.enquiry.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label={t.enquiry.name} required autoComplete="name" />
      <Field name="email" label={t.enquiry.email} type="email" required autoComplete="email" />
      <Field name="phone" label={t.enquiry.phone} type="tel" required autoComplete="tel" />
      <div className="hidden sm:block" />
      <Field name="pickupDate" label={t.enquiry.pickup} type="date" />
      <Field name="dropoffDate" label={t.enquiry.dropoff} type="date" />

      <label className="sm:col-span-2">
        <span className="text-sm text-ink-700">{t.enquiry.message}</span>
        <textarea
          name="message"
          rows={4}
          className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-ink-900"
        />
      </label>

      {problem ? (
        <p role="alert" className="text-sm text-maroon-600 sm:col-span-2">
          {problem}
        </p>
      ) : null}

      <p className="text-xs text-ink-500 sm:col-span-2">{t.enquiry.noBooking}</p>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-maroon-700 px-6 py-3 font-medium text-white transition-colors hover:bg-maroon-600 disabled:opacity-60"
        >
          {state === "sending" ? t.enquiry.sending : t.enquiry.submit}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}

function Field({ name, label, type = "text", required, autoComplete }: FieldProps) {
  return (
    <label>
      <span className="text-sm text-ink-700">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-ink-900"
      />
    </label>
  );
}
