/**
 * Server-side page loader for admin data that attaches session context via the
 * API and redirects to management login when authentication fails.
 */
import { redirect } from "next/navigation"
import { ApiError } from "./api"
import { serverApi } from "./server"

export async function adminGet<T>(path: string): Promise<T> {
  try {
    return await (await serverApi()).get<T>(path)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    throw error
  }
}
