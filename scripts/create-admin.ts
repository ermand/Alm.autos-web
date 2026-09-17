/**
 * Creates or resets the single admin account.
 *
 * There is no self-signup and no self-service reset by design, so this is how
 * the account comes into existence and how a forgotten password is fixed.
 *
 *   bun run admin:create -- owner@example.com
 *
 * The password is read from stdin so it never lands in shell history.
 */

import { createInterface } from "node:readline/promises";
import { eq } from "drizzle-orm";
import { adminUsers } from "~/db/schema.ts";
import { hashPassword } from "~/server/auth.ts";
import { getDb, hasDatabase } from "~/server/db.ts";

if (!hasDatabase()) throw new Error("DATABASE_URL is not set.");

const email = process.argv[2]?.trim().toLowerCase();
if (!email?.includes("@")) {
  throw new Error("Usage: bun run admin:create -- owner@example.com");
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = (await rl.question(`Password for ${email}: `)).trim();
rl.close();

if (password.length < 12) {
  throw new Error("Use at least 12 characters. This is the only account.");
}

const db = getDb();
const passwordHash = await hashPassword(password);

const [existing] = await db
  .select({ id: adminUsers.id })
  .from(adminUsers)
  .where(eq(adminUsers.email, email))
  .limit(1);

if (existing) {
  await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, existing.id));
  process.stdout.write(`Password updated for ${email}\n`);
} else {
  await db.insert(adminUsers).values({ email, passwordHash });
  process.stdout.write(`Created ${email}\n`);
}

process.exit(0);
