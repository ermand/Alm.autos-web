import { redirect } from "@tanstack/react-router";
import { getCookie } from "@tanstack/react-start/server";
import { type AdminSession, resolveSession, SESSION_COOKIE } from "~/server/auth.ts";

/**
 * Every admin server function starts with requireAdmin(). The guard lives on
 * the functions rather than only on the route, because a route guard protects
 * the page while the data is what actually needs protecting.
 *
 * It lives in its own module because it is a plain function, not a server
 * function: exported from the same file as a server function it would survive
 * handler-stripping and pull server-only APIs into the client bundle.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await resolveSession(getCookie(SESSION_COOKIE));
  if (!session) throw redirect({ to: "/admin/login" });
  return session;
}
