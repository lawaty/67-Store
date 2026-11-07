/**
 * Centralises session cookie names and options (account and admin, httpOnly,
 * sameSite) so cookie behavior is defined in one place.
 */
export const SESSION_COOKIE = "session"
export const ADMIN_COOKIE = "admin_session"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7
export const ADMIN_MAX_AGE = 60 * 60 * 8

type CookieOptions = {
  httpOnly: true
  sameSite: "lax"
  path: "/"
  secure: boolean
  maxAge: number
}

type Cookie = {
  name: string
  value: string
  options: CookieOptions
}

function cookie(name: string, token: string, maxAge: number): Cookie {
  return {
    name,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge,
    },
  }
}

export function sessionCookie(token: string, maxAgeSeconds: number = SESSION_MAX_AGE): Cookie {
  return cookie(SESSION_COOKIE, token, maxAgeSeconds)
}

export function adminCookie(token: string): Cookie {
  return cookie(ADMIN_COOKIE, token, ADMIN_MAX_AGE)
}
