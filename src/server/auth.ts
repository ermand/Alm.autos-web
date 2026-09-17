import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { adminSessions, adminUsers } from "~/db/schema.ts";
import { getDb, hasDatabase } from "./db.ts";

/**
 * Admin authentication.
 *
 * One account, password + session cookie. scrypt comes from node:crypto so
 * there is no password-hashing dependency to keep current, and it runs under
 * the same Node the server does (Bun.password would not).
 */

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;
const SESSION_DAYS = 30;
export const SESSION_COOKIE = "alm_admin";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;

  const derived = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  const expectedBuffer = Buffer.from(expected, "hex");
  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (expectedBuffer.length !== derived.length) return false;
  return timingSafeEqual(derived, expectedBuffer);
}

/** The cookie carries the token; the database stores only its hash. */
function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AdminSession {
  readonly userId: string;
  readonly email: string;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await getDb()
    .insert(adminSessions)
    .values({ id: tokenHash(token), userId, expiresAt });

  return { token, expiresAt };
}

export async function resolveSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token || !hasDatabase()) return null;

  const db = getDb();
  const [row] = await db
    .select({ userId: adminUsers.id, email: adminUsers.email })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(eq(adminSessions.id, tokenHash(token)), gt(adminSessions.expiresAt, new Date())))
    .limit(1);

  return row ?? null;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token || !hasDatabase()) return;
  await getDb()
    .delete(adminSessions)
    .where(eq(adminSessions.id, tokenHash(token)));
}

/** Expired rows are dead weight; clearing them on login keeps the table honest. */
export async function purgeExpiredSessions(): Promise<void> {
  if (!hasDatabase()) return;
  await getDb().delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
}

export async function findAdminByEmail(email: string) {
  const [row] = await getDb()
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email.toLowerCase()))
    .limit(1);
  return row ?? null;
}

/**
 * Login throttling, in memory.
 *
 * One box, one Node process, one account — a shared store would be ceremony.
 * Worst case a restart forgives the attempt count, which matters little when
 * there is exactly one password to guess and it is not a dictionary word.
 */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry || Date.now() > entry.resetAt) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count++;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

export async function findAdminById(id: string) {
  const [row] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return row ?? null;
}

/** Addresses are stored lowercased so the same address is one address. */
export async function updateAdminEmail(id: string, email: string): Promise<void> {
  await getDb()
    .update(adminUsers)
    .set({ email: email.trim().toLowerCase() })
    .where(eq(adminUsers.id, id));
}

export async function updateAdminPassword(id: string, passwordHash: string): Promise<void> {
  await getDb().update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, id));
}

/**
 * Signs out every other device after a password change.
 *
 * Changing a password usually means someone believes it was known to somebody
 * else; leaving old sessions alive would make the change cosmetic. The current
 * session survives so the owner is not thrown out of the page he is on.
 */
export async function revokeOtherSessions(userId: string, currentToken: string): Promise<number> {
  const removed = await getDb()
    .delete(adminSessions)
    .where(and(eq(adminSessions.userId, userId), ne(adminSessions.id, tokenHash(currentToken))))
    .returning({ id: adminSessions.id });
  return removed.length;
}
