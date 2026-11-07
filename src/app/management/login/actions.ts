"use server"
/**
 * Server action that authenticates an admin password via the API, sets the session cookie, and redirects.
 */

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import type { AdminAuthResultDto } from "@/api/contracts"
import { adminCookie } from "@/shared/session-cookie"

export async function signInAdmin(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "")

  let result: AdminAuthResultDto
  try {
    result = await (await serverApi()).post<AdminAuthResultDto>("/api/admin/session", { password })
  } catch (error) {
    if (error instanceof ApiError) redirect("/management/login?error=1")
    throw error
  }

  const cookieStore = await cookies()
  cookieStore.set(adminCookie(result.token))
  redirect("/management")
}
