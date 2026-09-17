/**
 * Rules for changing the admin account's own email and password.
 *
 * Kept out of the form and the server function so both check the same thing,
 * and so the rules can be tested without a browser or a database. The error
 * codes are message keys, so nothing is written twice.
 */

export type EmailField = "email" | "currentPassword";
export type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";

export type AccountErrorCode =
  | "missing"
  | "badEmail"
  | "sameEmail"
  | "tooShort"
  | "samePassword"
  | "mismatch";

export type EmailErrors = Partial<Record<EmailField, AccountErrorCode>>;
export type PasswordErrors = Partial<Record<PasswordField, AccountErrorCode>>;

/** Deliberately loose: the point is to catch typos, not to police addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Long rather than complicated. There is one account and no reset flow, so a
 * memorable passphrase beats a short string of symbols nobody can recall.
 */
export const MIN_PASSWORD_LENGTH = 12;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmailChange(input: {
  email: string;
  currentPassword: string;
  existingEmail: string;
}): EmailErrors {
  const errors: EmailErrors = {};
  const email = normaliseEmail(input.email);

  if (!email) errors.email = "missing";
  else if (!EMAIL.test(email)) errors.email = "badEmail";
  else if (email === normaliseEmail(input.existingEmail)) errors.email = "sameEmail";

  // Changing the address that owns the account is an identity change, so it
  // costs the password even though the visitor is already signed in.
  if (!input.currentPassword) errors.currentPassword = "missing";

  return errors;
}

export function validatePasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): PasswordErrors {
  const errors: PasswordErrors = {};

  if (!input.currentPassword) errors.currentPassword = "missing";

  if (!input.newPassword) errors.newPassword = "missing";
  else if (input.newPassword.length < MIN_PASSWORD_LENGTH) errors.newPassword = "tooShort";
  else if (input.newPassword === input.currentPassword) errors.newPassword = "samePassword";

  if (!input.confirmPassword) errors.confirmPassword = "missing";
  else if (input.confirmPassword !== input.newPassword) errors.confirmPassword = "mismatch";

  return errors;
}

/** The field to focus, in the order the fields appear in each form. */
export function firstInvalid<T extends string>(
  order: readonly T[],
  errors: Partial<Record<T, AccountErrorCode>>,
): T | undefined {
  return order.find((field) => errors[field] !== undefined);
}

export const EMAIL_FIELD_ORDER: readonly EmailField[] = ["email", "currentPassword"];
export const PASSWORD_FIELD_ORDER: readonly PasswordField[] = [
  "currentPassword",
  "newPassword",
  "confirmPassword",
];
