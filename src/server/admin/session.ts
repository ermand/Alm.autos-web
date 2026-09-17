import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestIP, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  clearAttempts,
  createSession,
  destroySession,
  findAdminByEmail,
  purgeExpiredSessions,
  recordFailedAttempt,
  resolveSession,
  SESSION_COOKIE,
  tooManyAttempts,
  verifyPassword,
} from "~/server/auth.ts";
import { config } from "~/server/config.ts";
import { hasDatabase } from "~/server/db.ts";

export const fetchCurrentAdmin = createServerFn({ method: "GET" }).handler(async () => {
  if (!hasDatabase()) return null;
  return resolveSession(getCookie(SESSION_COOKIE));
});

export const adminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().min(1), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    if (!hasDatabase()) {
      throw new Error("DATABASE_URL is not set; the admin cannot run without a database.");
    }

    const client = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    if (tooManyAttempts(client)) {
      return { ok: false as const, reason: "throttled" as const };
    }

    const user = await findAdminByEmail(data.email);
    // Hash regardless of whether the account exists, so a missing account and a
    // wrong password take the same time to answer.
    const stored = user?.passwordHash ?? "scrypt:0000:0000";
    const valid = await verifyPassword(data.password, stored);

    if (!user || !valid) {
      recordFailedAttempt(client);
      return { ok: false as const, reason: "invalid" as const };
    }

    clearAttempts(client);
    await purgeExpiredSessions();

    const { token, expiresAt } = await createSession(user.id);
    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      // Keyed to the scheme the site is actually served over, not to NODE_ENV.
      // NODE_ENV is easy to leave unset on a server — it defaults to
      // development here — and the cost of that is a session cookie sent
      // without Secure over HTTPS. SITE_URL has to be right for canonical links
      // and the sitemap anyway, so it is the more reliable signal.
      secure: config().isSecureOrigin,
      path: "/",
      expires: expiresAt,
    });

    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession(getCookie(SESSION_COOKIE));
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true as const };
});
