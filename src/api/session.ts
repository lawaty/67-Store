/**
 * Resolves authenticated account and admin sessions from signed cookies.
 * Redirects to the appropriate login route when a required session is missing or invalid.
 */
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { readEnv } from "@/env"
import { verifySession } from "@/accounts"
import { SESSION_COOKIE } from "@/shared/session-cookie"
import { ADMIN_COOKIE, isAdminToken } from "@/backoffice"

export async function currentAccount(): Promise<{ accountId: string; clientId: string } | null> {
  const env = readEnv(process.env as Record<string, string | undefined>)
  if (env.authSecret === "") {
    return null
  }
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) {
    return null
  }
  const session = verifySession(token, env.authSecret)
  if (session === null) {
    return null
  }
  return { accountId: session.accountId, clientId: session.clientId }
}

export async function requireAccount(): Promise<{ accountId: string; clientId: string }> {
  const account = await currentAccount()
  if (account === null) {
    redirect("/account/login")
  }
  return account
}

export async function requireAdmin(): Promise<void> {
  const env = readEnv(process.env as Record<string, string | undefined>)
  const cookieStore = await cookies()
  const value = cookieStore.get(ADMIN_COOKIE)?.value ?? ""
  if (env.adminPassword === "") {
    throw new Error("ADMIN_PASSWORD is required to use the back office")
  }
  if (!isAdminToken(value, env.adminPassword)) {
    redirect("/management/login")
  }
}
