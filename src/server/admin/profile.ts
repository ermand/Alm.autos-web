import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import {
  MIN_PASSWORD_LENGTH,
  normaliseEmail,
  validateEmailChange,
  validatePasswordChange,
} from "~/domain/account.ts";
import {
  findAdminByEmail,
  findAdminById,
  hashPassword,
  revokeOtherSessions,
  SESSION_COOKIE,
  updateAdminEmail,
  updateAdminPassword,
  verifyPassword,
} from "~/server/auth.ts";
import { requireAdmin } from "./guard.ts";

/**
 * The owner's own account. There is one account and no reset flow, so this is
 * the only way to change either value without shell access to the box.
 *
 * Both operations re-check the current password. The visitor is already signed
 * in, but an unattended browser should not be enough to take the account over.
 */

export const fetchProfile = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireAdmin();
  return { email: session.email };
});

/** Codes rather than sentences, so the page can say them in Albanian. */
type Outcome = { ok: true } | { ok: false; reason: "wrongPassword" | "emailTaken" | "invalid" };

export const changeEmail = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string(), currentPassword: z.string() }))
  .handler(async ({ data }): Promise<Outcome> => {
    const session = await requireAdmin();
    const user = await findAdminById(session.userId);
    if (!user) return { ok: false, reason: "invalid" };

    const problems = validateEmailChange({
      email: data.email,
      currentPassword: data.currentPassword,
      existingEmail: user.email,
    });
    if (Object.keys(problems).length > 0) return { ok: false, reason: "invalid" };

    if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
      return { ok: false, reason: "wrongPassword" };
    }

    // The column is unique, so a clash would otherwise surface as a database
    // error rather than something the page can explain.
    const email = normaliseEmail(data.email);
    const clash = await findAdminByEmail(email);
    if (clash && clash.id !== user.id) return { ok: false, reason: "emailTaken" };

    await updateAdminEmail(user.id, email);
    return { ok: true };
  });

export const changePassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      currentPassword: z.string(),
      newPassword: z.string(),
      confirmPassword: z.string(),
    }),
  )
  .handler(async ({ data }): Promise<Outcome & { signedOutElsewhere?: number }> => {
    const session = await requireAdmin();
    const user = await findAdminById(session.userId);
    if (!user) return { ok: false, reason: "invalid" };

    const problems = validatePasswordChange(data);
    if (Object.keys(problems).length > 0) return { ok: false, reason: "invalid" };

    if (!(await verifyPassword(data.currentPassword, user.passwordHash))) {
      return { ok: false, reason: "wrongPassword" };
    }

    await updateAdminPassword(user.id, await hashPassword(data.newPassword));

    // Every other device is signed out; otherwise the change is cosmetic.
    const token = getCookie(SESSION_COOKIE);
    const signedOutElsewhere = token ? await revokeOtherSessions(user.id, token) : 0;

    return { ok: true, signedOutElsewhere };
  });

export { MIN_PASSWORD_LENGTH };
