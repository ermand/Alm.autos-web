import { describe, expect, it } from "vitest";
import {
  type BaseRates,
  fromPriceCents,
  hasTieredPricing,
  quote,
  rentalDays,
  type Season,
  seasonFor,
  tierFor,
} from "./pricing.ts";

/** €40 / €35 / €30 / €25 per day across the four tiers. */
const RATES: BaseRates = {
  "1-3": 4000,
  "4-7": 3500,
  "8-29": 3000,
  "30+": 2500,
};

const HIGH: Season = {
  name: "High Season",
  from: { month: 7, day: 1 },
  to: { month: 8, day: 31 },
  multiplier: 1.35,
};

const NEW_YEAR: Season = {
  name: "New Year",
  from: { month: 12, day: 20 },
  to: { month: 1, day: 5 },
  multiplier: 1.2,
};

describe("rentalDays", () => {
  it("counts the nights between pickup and dropoff", () => {
    expect(rentalDays("2026-07-01", "2026-07-04")).toBe(3);
  });

  it("charges a same-day return as one day", () => {
    expect(rentalDays("2026-07-01", "2026-07-01")).toBe(1);
  });

  it("counts across a month boundary", () => {
    expect(rentalDays("2026-08-28", "2026-09-05")).toBe(8);
  });

  it("counts across a leap day", () => {
    expect(rentalDays("2028-02-27", "2028-03-01")).toBe(3);
  });

  it("rejects a dropoff before the pickup", () => {
    expect(() => rentalDays("2026-07-10", "2026-07-01")).toThrow(/before pickup/i);
  });
});

describe("tierFor", () => {
  it.each([
    [1, "1-3"],
    [3, "1-3"],
    [4, "4-7"],
    [7, "4-7"],
    [8, "8-29"],
    [29, "8-29"],
    [30, "30+"],
    [365, "30+"],
  ])("puts %i days in tier %s", (days, expected) => {
    expect(tierFor(days)).toBe(expected);
  });

  it("rejects a rental of less than one day", () => {
    expect(() => tierFor(0)).toThrow(/at least one day/i);
  });
});

describe("seasonFor", () => {
  it("matches a date inside a season", () => {
    expect(seasonFor("2026-07-15", [HIGH])?.name).toBe("High Season");
  });

  it("includes both endpoints", () => {
    expect(seasonFor("2026-07-01", [HIGH])?.name).toBe("High Season");
    expect(seasonFor("2026-08-31", [HIGH])?.name).toBe("High Season");
  });

  it("returns nothing for a date no season covers", () => {
    expect(seasonFor("2026-09-01", [HIGH])).toBeUndefined();
  });

  it("recurs every year without re-entry", () => {
    expect(seasonFor("2031-07-15", [HIGH])?.name).toBe("High Season");
  });

  it("handles a season wrapping the new year", () => {
    expect(seasonFor("2026-12-25", [NEW_YEAR])?.name).toBe("New Year");
    expect(seasonFor("2026-01-03", [NEW_YEAR])?.name).toBe("New Year");
    expect(seasonFor("2026-06-10", [NEW_YEAR])).toBeUndefined();
  });

  it("takes the first match when seasons overlap", () => {
    const overlapping: Season[] = [
      { ...NEW_YEAR, name: "Christmas", multiplier: 1.5 },
      { name: "Winter", from: { month: 11, day: 1 }, to: { month: 2, day: 28 }, multiplier: 1.1 },
    ];
    expect(seasonFor("2026-12-25", overlapping)?.name).toBe("Christmas");
  });
});

describe("quote", () => {
  it("prices a short rental with no season at the base rate", () => {
    const result = quote({
      pickup: "2026-10-01",
      dropoff: "2026-10-04",
      rates: RATES,
      seasons: [HIGH],
    });

    expect(result.days).toBe(3);
    expect(result.tier).toBe("1-3");
    expect(result.totalCents).toBe(3 * 4000);
  });

  it("applies the multiplier to every day inside a season", () => {
    const result = quote({
      pickup: "2026-07-10",
      dropoff: "2026-07-13",
      rates: RATES,
      seasons: [HIGH],
    });

    // 3 days, tier 1-3, all in High Season: 4000 * 1.35 = 5400.
    expect(result.totalCents).toBe(3 * 5400);
  });

  it("prices each day by its own season across a boundary", () => {
    const result = quote({
      pickup: "2026-08-28",
      dropoff: "2026-09-05",
      rates: RATES,
      seasons: [HIGH],
    });

    // 8 days fixes the tier at 8-29 (3000/day) for the whole rental.
    // 28-31 Aug are High Season (4 x 4050), 1-4 Sep are base (4 x 3000).
    expect(result.days).toBe(8);
    expect(result.tier).toBe("8-29");
    expect(result.totalCents).toBe(4 * 4050 + 4 * 3000);
  });

  it("fixes the tier by total length, not by the season of each day", () => {
    const eightDays = quote({
      pickup: "2026-08-28",
      dropoff: "2026-09-05",
      rates: RATES,
      seasons: [HIGH],
    });
    const threeDays = quote({
      pickup: "2026-08-28",
      dropoff: "2026-08-31",
      rates: RATES,
      seasons: [HIGH],
    });

    // The same August day is cheaper on the longer rental.
    expect(eightDays.lines[0]?.cents).toBe(4050);
    expect(threeDays.lines[0]?.cents).toBe(5400);
  });

  it("cannot be gamed by shifting the pickup one day", () => {
    const inside = quote({
      pickup: "2026-08-30",
      dropoff: "2026-09-02",
      rates: RATES,
      seasons: [HIGH],
    });
    const shifted = quote({
      pickup: "2026-08-31",
      dropoff: "2026-09-03",
      rates: RATES,
      seasons: [HIGH],
    });

    // Both are 3 days, but the first has 2 high-season days and the second 1.
    expect(inside.totalCents).toBe(2 * 5400 + 1 * 4000);
    expect(shifted.totalCents).toBe(1 * 5400 + 2 * 4000);
  });

  it("names the season on each line so a quote can be explained", () => {
    const result = quote({
      pickup: "2026-08-30",
      dropoff: "2026-09-01",
      rates: RATES,
      seasons: [HIGH],
    });

    expect(result.lines.map((line) => line.seasonName)).toEqual(["High Season", "High Season"]);
  });

  it("rounds each day to the cent rather than the total", () => {
    const awkward: Season = { ...HIGH, multiplier: 1.333 };
    const result = quote({
      pickup: "2026-07-01",
      dropoff: "2026-07-04",
      rates: RATES,
      seasons: [awkward],
    });

    // 4000 * 1.333 = 5332 exactly; three such days.
    expect(result.lines.every((line) => line.cents === 5332)).toBe(true);
    expect(result.totalCents).toBe(3 * 5332);
  });

  it("prices a month-long rental in the cheapest tier", () => {
    const result = quote({
      pickup: "2026-10-01",
      dropoff: "2026-10-31",
      rates: RATES,
      seasons: [],
    });

    expect(result.days).toBe(30);
    expect(result.tier).toBe("30+");
    expect(result.totalCents).toBe(30 * 2500);
  });
});

describe("hasTieredPricing", () => {
  it("is false when every tier costs the same", () => {
    expect(hasTieredPricing({ "1-3": 3000, "4-7": 3000, "8-29": 3000, "30+": 3000 })).toBe(false);
  });

  it("is true as soon as one tier differs", () => {
    expect(hasTieredPricing(RATES)).toBe(true);
  });
});

describe("fromPriceCents", () => {
  it("is the cheapest tier, which is what the card advertises", () => {
    expect(fromPriceCents(RATES)).toBe(2500);
  });
});
