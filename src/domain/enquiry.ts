/**
 * What makes an Enquiry worth sending.
 *
 * Kept out of the form component so the rules can be tested without rendering
 * anything, and so the error codes line up with the message keys in
 * ~/i18n/messages.ts rather than being written twice.
 */

export type EnquiryField = "name" | "email" | "phone" | "pickupDate" | "dropoffDate";

/** Each code is a key under `enquiry` in the message catalogue. */
export type EnquiryErrorCode = "missing" | "badEmail" | "badPhone" | "datesBackwards";

export type EnquiryValues = Record<EnquiryField, string>;
export type EnquiryErrors = Partial<Record<EnquiryField, EnquiryErrorCode>>;

/** Deliberately loose: the point is to catch typos, not to police addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Enough digits to be a phone number, ignoring spaces, dashes and country code punctuation. */
const MIN_PHONE_DIGITS = 6;

export function validateEnquiry(values: EnquiryValues): EnquiryErrors {
  const errors: EnquiryErrors = {};

  if (!values.name.trim()) errors.name = "missing";

  if (!values.email.trim()) errors.email = "missing";
  else if (!EMAIL.test(values.email.trim())) errors.email = "badEmail";

  if (!values.phone.trim()) errors.phone = "missing";
  else if (values.phone.replace(/\D/g, "").length < MIN_PHONE_DIGITS) errors.phone = "badPhone";

  // Both dates are optional, but if given they have to make sense. The quote
  // engine refuses a backwards range outright, so storing one is storing junk.
  // ISO dates compare correctly as strings, which is why they are stored that way.
  if (values.pickupDate && values.dropoffDate && values.dropoffDate < values.pickupDate) {
    errors.dropoffDate = "datesBackwards";
  }

  return errors;
}

/** The field to move focus to, in the order the fields appear in the form. */
export const FIELD_ORDER: readonly EnquiryField[] = [
  "name",
  "email",
  "phone",
  "pickupDate",
  "dropoffDate",
];

export function firstInvalidField(errors: EnquiryErrors): EnquiryField | undefined {
  return FIELD_ORDER.find((field) => errors[field] !== undefined);
}
