import { describe, expect, it } from "vitest";
import {
  EMAIL_FIELD_ORDER,
  firstInvalid,
  MIN_PASSWORD_LENGTH,
  normaliseEmail,
  PASSWORD_FIELD_ORDER,
  validateEmailChange,
  validatePasswordChange,
} from "./account.ts";

const LONG = "a-long-enough-passphrase";

describe("validateEmailChange", () => {
  const base = { email: "new@alm.autos", currentPassword: LONG, existingEmail: "old@alm.autos" };

  it("accepts a different, valid address with the password given", () => {
    expect(validateEmailChange(base)).toEqual({});
  });

  it("requires the password, because this changes who owns the account", () => {
    expect(validateEmailChange({ ...base, currentPassword: "" }).currentPassword).toBe("missing");
  });

  it("refuses an address that is not one", () => {
    expect(validateEmailChange({ ...base, email: "" }).email).toBe("missing");
    expect(validateEmailChange({ ...base, email: "owner" }).email).toBe("badEmail");
    expect(validateEmailChange({ ...base, email: "owner@alm" }).email).toBe("badEmail");
  });

  it("refuses the address it already has, including a different casing", () => {
    expect(validateEmailChange({ ...base, email: "old@alm.autos" }).email).toBe("sameEmail");
    expect(validateEmailChange({ ...base, email: "  OLD@ALM.AUTOS " }).email).toBe("sameEmail");
  });
});

describe("validatePasswordChange", () => {
  const base = {
    currentPassword: LONG,
    newPassword: "a-brand-new-passphrase",
    confirmPassword: "a-brand-new-passphrase",
  };

  it("accepts a long new password typed twice", () => {
    expect(validatePasswordChange(base)).toEqual({});
  });

  it("requires the current password", () => {
    expect(validatePasswordChange({ ...base, currentPassword: "" }).currentPassword).toBe(
      "missing",
    );
  });

  it("refuses a new password shorter than the minimum", () => {
    const short = "x".repeat(MIN_PASSWORD_LENGTH - 1);
    const errors = validatePasswordChange({ ...base, newPassword: short, confirmPassword: short });
    expect(errors.newPassword).toBe("tooShort");
  });

  it("accepts exactly the minimum length", () => {
    const exact = "x".repeat(MIN_PASSWORD_LENGTH);
    const errors = validatePasswordChange({ ...base, newPassword: exact, confirmPassword: exact });
    expect(errors.newPassword).toBeUndefined();
  });

  it("refuses changing a password to itself", () => {
    const errors = validatePasswordChange({
      currentPassword: LONG,
      newPassword: LONG,
      confirmPassword: LONG,
    });
    expect(errors.newPassword).toBe("samePassword");
  });

  it("catches a mistyped confirmation", () => {
    const errors = validatePasswordChange({ ...base, confirmPassword: "something-else-entirely" });
    expect(errors.confirmPassword).toBe("mismatch");
  });

  it("does not report a mismatch when the confirmation is simply empty", () => {
    const errors = validatePasswordChange({ ...base, confirmPassword: "" });
    expect(errors.confirmPassword).toBe("missing");
  });
});

describe("normaliseEmail", () => {
  it("trims and lowercases, so the same address is one address", () => {
    expect(normaliseEmail("  Owner@ALM.Autos  ")).toBe("owner@alm.autos");
  });
});

describe("firstInvalid", () => {
  it("follows form order rather than object key order", () => {
    const errors = validatePasswordChange({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    expect(firstInvalid(PASSWORD_FIELD_ORDER, errors)).toBe("currentPassword");
  });

  it("returns nothing when there is nothing wrong", () => {
    expect(
      firstInvalid(
        EMAIL_FIELD_ORDER,
        validateEmailChange({
          email: "new@alm.autos",
          currentPassword: LONG,
          existingEmail: "old@alm.autos",
        }),
      ),
    ).toBeUndefined();
  });
});
