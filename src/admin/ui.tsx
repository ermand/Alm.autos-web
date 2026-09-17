import type { ReactNode } from "react";

/** Small shared form pieces. The admin is used on a phone, so targets stay large. */

export function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-sand-200 bg-white p-5">{children}</section>;
}

export function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg text-ink-900">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-ink-500">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-ink-900 disabled:bg-sand-100 disabled:text-ink-500";

interface FieldProps {
  label: string;
  hint?: string;
  /**
   * Rendered inside the label, so a screen reader announces it together with
   * the field without needing an id for aria-describedby. The wrapping label
   * is what makes that work.
   */
  error?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  // content-start keeps the rows at their natural height. Without it a field
  // sitting beside a taller one — say one with a hint next to one without —
  // stretches to match, and the extra space goes to the rows: the input grows
  // and drifts down, so two fields on the same line stop lining up.
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: every call site passes a control as the child, and a wrapping label needs no htmlFor.
    <label className="grid content-start gap-1">
      <span className="text-sm text-ink-700">{label}</span>
      {children}
      {/* The message carries the meaning; colour only reinforces it. */}
      {error ? <span className="text-xs text-brand-700">{error}</span> : null}
      {hint && !error ? <span className="text-xs text-ink-500">{hint}</span> : null}
    </label>
  );
}

interface TextInputProps {
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  min?: number;
  max?: number;
  step?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "email" | "url";
  /** Password managers need this to offer the right thing. */
  autoComplete?: string;
}

export function TextInput({ invalid, ...props }: TextInputProps) {
  const border = invalid ? " border-brand-500" : "";
  return (
    <input {...props} aria-invalid={invalid ? true : undefined} className={inputClass + border} />
  );
}

export function TextArea({
  name,
  defaultValue,
  rows = 4,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  return <textarea name={name} defaultValue={defaultValue} rows={rows} className={inputClass} />;
}

interface SelectProps {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  emptyLabel?: string;
  disabled?: boolean;
}

export function Select({ name, defaultValue, options, emptyLabel, disabled }: SelectProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      disabled={disabled}
      className={inputClass}
    >
      {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 py-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-5 w-5 rounded border-sand-300 accent-brand-500"
      />
      <span className="text-sm text-ink-700">{label}</span>
    </label>
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type === "submit" ? "submit" : "button"}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full bg-brand-500 px-6 py-3 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function QuietButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-40 ${
        danger
          ? "border-brand-200 text-brand-600 hover:border-brand-400"
          : "border-sand-200 text-ink-700 hover:border-brand-400"
      }`}
    >
      {children}
    </button>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${
        tone === "error" ? "bg-brand-50 text-brand-500" : "bg-sand-100 text-ink-700"
      }`}
    >
      {children}
    </p>
  );
}
