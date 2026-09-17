import { type FormEvent, useId, useRef, useState } from "react";
import {
  type EnquiryErrors,
  type EnquiryField,
  firstInvalidField,
  validateEnquiry,
} from "~/domain/enquiry.ts";
import { type Locale, messagesFor } from "~/i18n/messages.ts";
import { submitEnquiry } from "~/server/enquiries.ts";

interface Props {
  locale: Locale;
  vehicleSlug?: string;
}

type State = "idle" | "sending" | "sent";

export function EnquiryForm({ locale, vehicleSlug }: Props) {
  const t = messagesFor(locale);
  const formId = useId();
  const [state, setState] = useState<State>("idle");
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pickup, setPickup] = useState("");
  const successRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldId = (name: string) => `${formId}-${name}`;
  const errorId = (name: string) => `${formId}-${name}-error`;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const read = (key: string) => String(form.get(key) ?? "").trim();

    const values: Record<EnquiryField, string> = {
      name: read("name"),
      email: read("email"),
      phone: read("phone"),
      pickupDate: read("pickupDate"),
      dropoffDate: read("dropoffDate"),
    };

    const found = validateEnquiry(values);
    setErrors(found);

    const firstInvalid = firstInvalidField(found);
    if (firstInvalid) {
      setFailure(t.enquiry.fixFields);
      // Move the caret to the problem rather than leaving the visitor to hunt.
      formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(fieldId(firstInvalid))}`)?.focus();
      return;
    }

    setState("sending");
    setFailure(null);

    try {
      await submitEnquiry({
        data: {
          name: values.name,
          email: values.email,
          phone: values.phone,
          pickupDate: values.pickupDate || null,
          dropoffDate: values.dropoffDate || null,
          message: read("message") || null,
          vehicleSlug: vehicleSlug ?? null,
          locale,
        },
      });
      setState("sent");
      // The form is gone; without this the confirmation is never announced.
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      console.error("Enquiry submission failed", error);
      setFailure(t.enquiry.error);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <p
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl bg-brand-50 p-6 text-ink-900 outline-none"
      >
        {t.enquiry.success}
      </p>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field
        id={fieldId("name")}
        errorId={errorId("name")}
        name="name"
        label={t.enquiry.name}
        type="text"
        required
        autoComplete="name"
        error={errors.name ? t.enquiry[errors.name] : undefined}
        optionalLabel={t.enquiry.optional}
      />
      <Field
        id={fieldId("email")}
        errorId={errorId("email")}
        name="email"
        label={t.enquiry.email}
        type="email"
        required
        autoComplete="email"
        error={errors.email ? t.enquiry[errors.email] : undefined}
        optionalLabel={t.enquiry.optional}
      />
      <Field
        id={fieldId("phone")}
        errorId={errorId("phone")}
        name="phone"
        label={t.enquiry.phone}
        type="tel"
        required
        autoComplete="tel"
        error={errors.phone ? t.enquiry[errors.phone] : undefined}
        optionalLabel={t.enquiry.optional}
      />
      <div className="hidden sm:block" />
      <Field
        id={fieldId("pickupDate")}
        errorId={errorId("pickupDate")}
        name="pickupDate"
        label={t.enquiry.pickup}
        type="date"
        error={errors.pickupDate ? t.enquiry[errors.pickupDate] : undefined}
        optionalLabel={t.enquiry.optional}
        onChange={setPickup}
      />
      <Field
        id={fieldId("dropoffDate")}
        errorId={errorId("dropoffDate")}
        name="dropoffDate"
        label={t.enquiry.dropoff}
        type="date"
        error={errors.dropoffDate ? t.enquiry[errors.dropoffDate] : undefined}
        optionalLabel={t.enquiry.optional}
        min={pickup}
      />

      <div className="sm:col-span-2">
        <label htmlFor={fieldId("message")} className="text-sm text-ink-700">
          {t.enquiry.message} <span className="text-ink-500">({t.enquiry.optional})</span>
        </label>
        <textarea
          id={fieldId("message")}
          name="message"
          rows={4}
          className="mt-1 w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-ink-900"
        />
      </div>

      {failure ? (
        <p
          role="alert"
          className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700 sm:col-span-2"
        >
          {failure}
        </p>
      ) : null}

      <p className="text-xs text-ink-500 sm:col-span-2">{t.enquiry.noBooking}</p>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {state === "sending" ? t.enquiry.sending : t.enquiry.submit}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  id: string;
  errorId: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  optionalLabel: string;
  min?: string;
  onChange?: (value: string) => void;
}

function Field({
  id,
  errorId,
  name,
  label,
  type,
  required,
  autoComplete,
  error,
  optionalLabel,
  min,
  onChange,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-ink-700">
        {label} {required ? null : <span className="text-ink-500">({optionalLabel})</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        min={min || undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-ink-900 ${
          error ? "border-brand-500" : "border-sand-200"
        }`}
      />
      {/* The message carries the meaning; the red border only reinforces it. */}
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-brand-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
