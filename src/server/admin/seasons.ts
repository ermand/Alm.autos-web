import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { seasons } from "~/db/schema.ts";
import { getDb } from "~/server/db.ts";
import { requireAdmin } from "./guard.ts";

/**
 * Seasons are fleet-wide and recur every year, so they carry a month and day
 * but no year — the owner sets High Season once rather than re-keying it each
 * January. `from` after `to` wraps the new year. See CONTEXT.md.
 */
const monthDay = z.object({
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
});

export const seasonInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    from: monthDay,
    to: monthDay,
    // 1.0 would be a season that does nothing; below 1 is a legitimate
    // off-season discount.
    multiplier: z.number().min(0.1).max(5),
    position: z.number().int().min(0),
  })
  .refine(({ from }) => from.day <= daysInMonth(from.month), {
    message: "That start date does not exist.",
    path: ["from"],
  })
  .refine(({ to }) => to.day <= daysInMonth(to.month), {
    message: "That end date does not exist.",
    path: ["to"],
  });

/** Leap-tolerant: February accepts 29 because a Season has no year. */
function daysInMonth(month: number): number {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 31;
}

export const listSeasonsForEdit = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return getDb().select().from(seasons).orderBy(asc(seasons.position));
});

export const saveSeason = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid().nullable(), input: seasonInputSchema }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();

    const values = {
      name: data.input.name,
      fromMonth: data.input.from.month,
      fromDay: data.input.from.day,
      toMonth: data.input.to.month,
      toDay: data.input.to.day,
      multiplier: data.input.multiplier,
      position: data.input.position,
    };

    if (data.id) {
      await db.update(seasons).set(values).where(eq(seasons.id, data.id));
      return { id: data.id };
    }

    const [created] = await db.insert(seasons).values(values).returning({ id: seasons.id });
    if (!created) throw new Error("The season could not be saved.");
    return { id: created.id };
  });

export const deleteSeason = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb().delete(seasons).where(eq(seasons.id, data.id));
    return { ok: true as const };
  });
