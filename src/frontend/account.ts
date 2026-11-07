/**
 * Server-side page loaders for account data that attach session context via the
 * API and redirect to login when authentication fails.
 */
import { redirect } from "next/navigation"
import type { AccountDto, ProfileDto } from "@/api/contracts"
import { ApiError } from "./api"
import { serverApi } from "./server"

export async function getAccount(): Promise<AccountDto | null> {
  try {
    return await (await serverApi()).get<AccountDto>("/api/account")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/account/login")
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function getProfiles(): Promise<ProfileDto[]> {
  try {
    return await (await serverApi()).get<ProfileDto[]>("/api/account/profiles")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/account/login")
    throw error
  }
}
