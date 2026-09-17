/**
 * Quote calculation for the ALM Autos fleet.
 *
 * Two rules do all the work, and they are deliberately independent:
 *  - the Tier is fixed once, by the rental's total length;
 *  - each day is then multiplied by whichever Season that day falls in.
 *
 * Pricing each day on its own is what stops a customer shaving a euro off by
 * shifting the pickup a day either side of a season boundary. See CONTEXT.md.
 */

/** A calendar date, `YYYY-MM-DD`. Rentals are whole days; time of day never matters. */
export type CalendarDate = string;

export type Tier = "1-3" | "4-7" | "8-29" | "30+";

export const TIERS: readonly Tier[] = ["1-3", "4-7", "8-29", "30+"];

/** Price per day in euro cents, one for each Tier. Integers throughout: no float money. */
export type BaseRates = Readonly<Record<Tier, number>>;

/** A day of the year, without the year — Seasons recur annually. */
export interface MonthDay {
  readonly month: number;
  readonly day: number;
}

/**
 * A date range across the whole fleet carrying a multiplier. Recurs every year,
 * so the owner sets it once. `from` after `to` wraps the new year
 * (20 Dec – 5 Jan).
 */
export interface Season {
  readonly name: string;
  readonly from: MonthDay;
  readonly to: MonthDay;
  readonly multiplier: number;
}

/** One day of a rental, priced. */
export interface QuoteLine {
  readonly date: CalendarDate;
  readonly cents: number;
  readonly seasonName: string | null;
}

export interface Quote {
  readonly days: number;
  readonly tier: Tier;
  readonly baseCents: number;
  readonly lines: readonly QuoteLine[];
  readonly totalCents: number;
}

export interface QuoteInput {
  readonly pickup: CalendarDate;
  readonly dropoff: CalendarDate;
  readonly rates: BaseRates;
  readonly seasons: readonly Season[];
}

const MS_PER_DAY = 86_400_000;

function toUtc(date: CalendarDate): number {
  const [year, month, day] = date.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid calendar date: "${date}". Expected YYYY-MM-DD.`);
  }
  const parsed = Date.UTC(year, month - 1, day);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid calendar date: "${date}". Expected YYYY-MM-DD.`);
  }
  return parsed;
}

function formatUtc(timestamp: number): CalendarDate {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** Ordinal that makes month/day comparable: 1 July becomes 701. */
function ordinal({ month, day }: MonthDay): number {
  return month * 100 + day;
}

/**
 * Days charged for a rental. A same-day return still costs one day, which is
 * how the counter actually quotes it.
 */
export function rentalDays(pickup: CalendarDate, dropoff: CalendarDate): number {
  const span = (toUtc(dropoff) - toUtc(pickup)) / MS_PER_DAY;
  if (span < 0) {
    throw new Error(`Dropoff ${dropoff} is before pickup ${pickup}.`);
  }
  return Math.max(1, span);
}

export function tierFor(days: number): Tier {
  if (days < 1) {
    throw new Error(`A rental must be at least one day, got ${days}.`);
  }
  if (days <= 3) return "1-3";
  if (days <= 7) return "4-7";
  if (days <= 29) return "8-29";
  return "30+";
}

/**
 * The Season covering a date, or undefined when none does — those days are
 * charged at the base rate. Seasons are not required to tile the year.
 * Where seasons overlap the first listed wins, so ordering is meaningful.
 */
export function seasonFor(date: CalendarDate, seasons: readonly Season[]): Season | undefined {
  const when = toUtc(date);
  const target = ordinal({
    month: new Date(when).getUTCMonth() + 1,
    day: new Date(when).getUTCDate(),
  });

  return seasons.find((season) => {
    const from = ordinal(season.from);
    const to = ordinal(season.to);
    return from <= to ? target >= from && target <= to : target >= from || target <= to;
  });
}

/**
 * Whether the tiers actually differ. A fleet seeded from the old site has one
 * price per car, and showing four identical rows reads as broken rather than
 * informative.
 */
export function hasTieredPricing(rates: BaseRates): boolean {
  return new Set(TIERS.map((tier) => rates[tier])).size > 1;
}

/** The headline figure on a vehicle card: the cheapest tier. */
export function fromPriceCents(rates: BaseRates): number {
  return Math.min(...TIERS.map((tier) => rates[tier]));
}

export function quote({ pickup, dropoff, rates, seasons }: QuoteInput): Quote {
  const days = rentalDays(pickup, dropoff);
  const tier = tierFor(days);
  const baseCents = rates[tier];
  const start = toUtc(pickup);

  const lines: QuoteLine[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = formatUtc(start + offset * MS_PER_DAY);
    const season = seasonFor(date, seasons);
    lines.push({
      date,
      cents: season ? Math.round(baseCents * season.multiplier) : baseCents,
      seasonName: season?.name ?? null,
    });
  }

  return {
    days,
    tier,
    baseCents,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.cents, 0),
  };
}
