"use server"
/**
 * Account server actions: handle sign-in, registration, and sign-out posts.
 * Sets the session cookie and redirects based on the action.
 */

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import type { AuthResultDto } from "@/api/contracts"
import { sessionCookie, SESSION_COOKIE } from "@/shared/session-cookie"
import { getLocale } from "@/i18n/server"

export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")

  let result: AuthResultDto
  try {
    result = await (await serverApi()).post<AuthResultDto>("/api/auth/signin", { email, password })
  } catch (error) {
    if (error instanceof ApiError) redirect("/account/login?error=1")
    throw error
  }

  const cookieStore = await cookies()
  cookieStore.set(sessionCookie(result.token, result.maxAge))
  redirect("/account")
}

export async function register(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const username = String(formData.get("username") ?? "")
  const next = String(formData.get("next") ?? "")
  const playerUserId = String(formData.get("playerUserId") ?? "")
  const playerServerId = String(formData.get("playerServerId") ?? "")
  const locale = await getLocale()

  let result: AuthResultDto
  try {
    result = await (await serverApi()).post<AuthResultDto>("/api/auth/register", {
      email,
      password,
      username,
      playerUserId,
      playerServerId,
      locale,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "password") redirect("/account/register?error=password")
      if (error.code === "invalid_username") redirect("/account/register?error=invalid_username")
      if (error.code === "username_taken") redirect("/account/register?error=username_taken")
      redirect("/account/register?error=1")
    }
    throw error
  }

  const cookieStore = await cookies()
  cookieStore.set(sessionCookie(result.token, result.maxAge))

  if (next !== "" && next.startsWith("/") && !next.startsWith("//")) {
    redirect(next)
  }
  redirect("/account")
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/")
}
