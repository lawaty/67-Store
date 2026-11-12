import { NextRequest, NextResponse } from "next/server";
import { readFileSync, statSync } from "fs";
import { join } from "path";
import { createHash, createHmac, timingSafeEqual } from "crypto";

// Site-wide pre-launch access gate: a self-contained login form plus a signed,
// HttpOnly session cookie. Enabled only when GATE_ENABLED=true. Credentials
// live in a hand-editable file, one "username:password" per line ('#' starts a
// comment); the file is re-read when its mtime changes. The cookie lasts
// GATE_COOKIE_TTL seconds (default 7200) and does NOT slide: after it expires
// the visitor must sign in again. The cookie is bound to the current password,
// so changing or removing a credential invalidates existing sessions.
export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const EXEMPT_PREFIXES = ["/api/jobs/", "/api/webhooks/"];
const USERS_FILE = process.env.GATE_USERS_FILE || join(process.cwd(), "gate-users.txt");
const COOKIE_NAME = "gate_session";
const COOKIE_TTL = Math.max(60, parseInt(process.env.GATE_COOKIE_TTL || "7200", 10) || 7200);
const COOKIE_SECRET = process.env.GATE_COOKIE_SECRET || process.env.AUTH_SECRET || "";
const LOGIN_PATH = "/gate-login";
const LOGOUT_PATH = "/gate-logout";
const GATE_FLAG_FILE = process.env.GATE_FLAG_FILE || join(process.cwd(), "gate-enabled");

type FlagCache = { mtimeMs: number; enabled: boolean | null };
let flagCache: FlagCache | null = null;

// Runtime on/off switch: app/gate-enabled containing "true" or "false".
// Falls back to the GATE_ENABLED env var when the file is absent or malformed.
function gateEnabled(): boolean {
  try {
    const st = statSync(GATE_FLAG_FILE);
    if (flagCache && flagCache.mtimeMs === st.mtimeMs) {
      return flagCache.enabled ?? process.env.GATE_ENABLED === "true";
    }
    const raw = readFileSync(GATE_FLAG_FILE, "utf8").trim().toLowerCase();
    const enabled = raw === "true" ? true : raw === "false" ? false : null;
    flagCache = { mtimeMs: st.mtimeMs, enabled };
    return enabled ?? process.env.GATE_ENABLED === "true";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      flagCache = null;
      return process.env.GATE_ENABLED === "true";
    }
    // A flag file that exists but cannot be read must not silently disable the
    // gate: reuse the last known value, or fail loudly if there is none.
    if (flagCache) return flagCache.enabled ?? process.env.GATE_ENABLED === "true";
    throw error;
  }
}

type UserCache = { mtimeMs: number; users: Map<string, string> };
let cache: UserCache | null = null;

function loadUsers(): Map<string, string> {
  try {
    const st = statSync(USERS_FILE);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.users;
    const users = new Map<string, string>();
    for (const raw of readFileSync(USERS_FILE, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf(":");
      if (idx <= 0) continue;
      users.set(line.slice(0, idx), line.slice(idx + 1));
    }
    cache = { mtimeMs: st.mtimeMs, users };
    return users;
  } catch {
    return new Map();
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function sign(payload: string): string {
  return createHmac("sha256", COOKIE_SECRET).update(payload).digest("hex");
}

function fingerprint(user: string, password: string): string {
  return createHash("sha256").update(`${user}:${password}`).digest("hex").slice(0, 16);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_TTL,
  };
}

function issueCookie(user: string, password: string): string {
  const exp = Math.floor(Date.now() / 1000) + COOKIE_TTL;
  const payload = `${user}:${exp}:${fingerprint(user, password)}`;
  return `${payload}:${sign(payload)}`;
}

function readCookie(
  value: string | undefined,
  users: Map<string, string>,
): { user: string; exp: number } | null {
  if (!value || !COOKIE_SECRET) return null;
  const parts = value.split(":");
  if (parts.length !== 4) return null;
  const [user, expStr, fp, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return null;
  const password = users.get(user);
  if (password === undefined) return null;
  if (!safeEqual(fingerprint(user, password), fp)) return null;
  if (!safeEqual(sign(`${user}:${expStr}:${fp}`), sig)) return null;
  return { user, exp };
}

function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  if (next === LOGIN_PATH || next === LOGOUT_PATH) return "/";
  return next;
}

function redirectUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get("host") || req.nextUrl.host;
  const internal = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(host);
  const proto = internal ? "http" : "https";
  return new URL(path, `${proto}://${host}`);
}

function htmlEscape(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

function loginPage(next: string, error: string | null): NextResponse {
  const err = error ? `<p class="err">${htmlEscape(error)}</p>` : "";
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>67 Store — Sign in</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0f14;color:#e8eef6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
form{background:#131a23;border:1px solid #24303d;border-radius:14px;padding:28px;width:min(360px,90vw);box-shadow:0 10px 40px rgba(0,0,0,.4)}
h1{font-size:18px;margin:0 0 18px;font-weight:600}
label{display:block;font-size:13px;color:#9fb0c3;margin:12px 0 6px}
input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;border:1px solid #2b3a4a;background:#0e151d;color:#e8eef6;font-size:15px}
input:focus{outline:2px solid #3b82f6;outline-offset:1px}
button{margin-top:18px;width:100%;padding:11px;border:0;border-radius:9px;background:#3b82f6;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
button:hover{background:#2f6fd6}
.err{margin:0 0 10px;color:#f87171;font-size:13px}
</style></head>
<body>
<form method="post" action="${LOGIN_PATH}">
<h1>67 Store — Sign in</h1>
${err}
<input type="hidden" name="next" value="${htmlEscape(next)}">
<label for="u">Username</label>
<input id="u" name="username" autocomplete="username" required autofocus>
<label for="p">Password</label>
<input id="p" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Sign in</button>
</form>
</body></html>`;
  return new NextResponse(body, {
    status: error ? 401 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function middleware(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (EXEMPT_PREFIXES.some((p) => path.startsWith(p))) return NextResponse.next();

  if (COOKIE_SECRET === "") {
    return new NextResponse("Access gate is enabled but GATE_COOKIE_SECRET (or AUTH_SECRET) is not configured.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const users = loadUsers();
  if (users.size === 0) {
    return new NextResponse("Access gate is enabled but no credentials are configured.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("host");
  const internalHost = !host || /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i.test(host);
  if (proto === "http" && host && !internalHost) {
    return NextResponse.redirect(`https://${host}${path}${req.nextUrl.search}`, 308);
  }

  const now = Math.floor(Date.now() / 1000);
  const session = readCookie(req.cookies.get(COOKIE_NAME)?.value, users);
  const authed = !!(session && session.exp > now);

  if (path === LOGOUT_PATH) {
    const res = NextResponse.redirect(redirectUrl(req, LOGIN_PATH), 303);
    res.cookies.set(COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
    return res;
  }

  if (path === LOGIN_PATH) {
    if (req.method === "POST") {
      let username = "";
      let password = "";
      let next = "/";
      try {
        const params = new URLSearchParams(await req.text());
        username = params.get("username") || "";
        password = params.get("password") || "";
        next = safeNext(params.get("next"));
      } catch {
        // ignore malformed body
      }
      const expected = users.get(username);
      if (expected !== undefined && safeEqual(expected, password)) {
        const res = NextResponse.redirect(redirectUrl(req, next), 303);
        res.cookies.set(COOKIE_NAME, issueCookie(username, password), cookieOptions());
        return res;
      }
      return loginPage(next, "Invalid username or password.");
    }
    if (authed) return NextResponse.redirect(redirectUrl(req, safeNext(req.nextUrl.searchParams.get("next"))), 303);
    return loginPage(safeNext(req.nextUrl.searchParams.get("next")), null);
  }

  if (authed) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const loginUrl = redirectUrl(req, LOGIN_PATH);
  loginUrl.searchParams.set("next", path + req.nextUrl.search);
  return NextResponse.redirect(loginUrl, 303);
}
