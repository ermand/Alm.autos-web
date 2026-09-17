import { describe, expect, it } from "vitest";
import { type EnquiryValues, firstInvalidField, validateEnquiry } from "./enquiry.ts";

const valid: EnquiryValues = {
  name: "Arben",
  email: "arben@example.com",
  phone: "+355 68 56 588 88",
  pickupDate: "",
  dropoffDate: "",
};

describe("validateEnquiry", () => {
  it("accepts a complete enquiry with no dates", () => {
    expect(validateEnquiry(valid)).toEqual({});
  });

  it("requires the three fields we need to reply", () => {
    expect(validateEnquiry({ ...valid, name: "   " }).name).toBe("missing");
    expect(validateEnquiry({ ...valid, email: "" }).email).toBe("missing");
    expect(validateEnquiry({ ...valid, phone: "" }).phone).toBe("missing");
  });

  it("catches an address that is obviously not one", () => {
    expect(validateEnquiry({ ...valid, email: "arben" }).email).toBe("badEmail");
    expect(validateEnquiry({ ...valid, email: "arben@example" }).email).toBe("badEmail");
    expect(validateEnquiry({ ...valid, email: "a b@example.com" }).email).toBe("badEmail");
  });

  it("accepts the punctuation people actually type in phone numbers", () => {
    for (const phone of ["+355 68 56 588 88", "068-565-8888", "(355) 685658888"]) {
      expect(validateEnquiry({ ...valid, phone }).phone, phone).toBeUndefined();
    }
  });

  it("rejects a phone number with too few digits to dial", () => {
    expect(validateEnquiry({ ...valid, phone: "12345" }).phone).toBe("badPhone");
  });

  describe("dates", () => {
    it("accepts a sensible range", () => {
      const errors = validateEnquiry({
        ...valid,
        pickupDate: "2026-08-28",
        dropoffDate: "2026-09-05",
      });
      expect(errors.dropoffDate).toBeUndefined();
    });

    it("accepts a same-day return", () => {
      const errors = validateEnquiry({
        ...valid,
        pickupDate: "2026-08-28",
        dropoffDate: "2026-08-28",
      });
      expect(errors.dropoffDate).toBeUndefined();
    });

    it("refuses a return before the pick-up", () => {
      const errors = validateEnquiry({
        ...valid,
        pickupDate: "2026-09-05",
        dropoffDate: "2026-08-28",
      });
      expect(errors.dropoffDate).toBe("datesBackwards");
    });

    it("refuses a backwards range across a year boundary", () => {
      const errors = validateEnquiry({
        ...valid,
        pickupDate: "2027-01-02",
        dropoffDate: "2026-12-30",
      });
      expect(errors.dropoffDate).toBe("datesBackwards");
    });

    it("ignores the order when only one date is given", () => {
      expect(validateEnquiry({ ...valid, pickupDate: "2026-08-28" }).dropoffDate).toBeUndefined();
      expect(validateEnquiry({ ...valid, dropoffDate: "2026-08-28" }).dropoffDate).toBeUndefined();
    });
  });
});

describe("firstInvalidField", () => {
  it("follows the order the fields appear in, not object key order", () => {
    const errors = validateEnquiry({ ...valid, name: "", email: "", phone: "" });
    expect(firstInvalidField(errors)).toBe("name");
  });

  it("finds a date error when the text fields are fine", () => {
    const errors = validateEnquiry({
      ...valid,
      pickupDate: "2026-09-05",
      dropoffDate: "2026-08-28",
    });
    expect(firstInvalidField(errors)).toBe("dropoffDate");
  });

  it("returns nothing when the enquiry is valid", () => {
    expect(firstInvalidField(validateEnquiry(valid))).toBeUndefined();
  });
});
