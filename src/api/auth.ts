/**
 * Extracts and verifies session and admin credentials from request cookies,
 * returning the authenticated viewer or admin status for API handlers.
 */

import { verifySession } from "@/accounts";
import { isAdminToken, ADMIN_COOKIE } from "@/backoffice";
import { SESSION_COOKIE } from "@/shared/session-cookie";
import { readEnv } from "@/env";

export { adminToken } from "@/backoffice";

export type RequestSession = { readonly accountId: string; readonly clientId: string };

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const name = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!name || value === undefined) continue;
    cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export function sessionFromRequest(request: Request): RequestSession | null {
  const env = readEnv(process.env as Record<string, string | undefined>);
  if (env.authSecret === "") return null;
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = verifySession(token, env.authSecret)
  return session === null ? null : { accountId: session.accountId, clientId: session.clientId }
}

export function isAdminRequest(request: Request): boolean {
  const env = readEnv(process.env as Record<string, string | undefined>);
  if (env.adminPassword === "") return false;
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[ADMIN_COOKIE] ?? "";
  return isAdminToken(token, env.adminPassword);
}