"use server"
/**
 * Handles admin wallet adjustment form posts, enforces auth checks, and
 * revalidates user list and detail routes.
 */

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import type { WalletOutcomeDto } from "@/api/contracts"

export async function adjustWallet(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "")
  const accountId = String(formData.get("accountId") ?? formData.get("id") ?? "")
  const amount = Number(String(formData.get("amount") ?? ""))
  const direction = String(formData.get("direction") ?? "")
  const reason = String(formData.get("reason") ?? "")
  const returnTo = String(formData.get("returnTo") ?? "")

  const fail = (code: string): never => {
    if (returnTo === "users") {
      redirect(`/management/users?error=${code}`)
    }
    redirect(accountId === "" ? "/management/users" : `/management/users/${accountId}?error=${code}`)
  }

  if (direction !== "credit" && direction !== "debit") fail("invalid")
  if (reason.trim() === "") fail("reason")

  let outcome: WalletOutcomeDto
  try {
    outcome = await (await serverApi()).post<WalletOutcomeDto>("/api/admin/wallet", {
      clientId,
      accountId,
      amount,
      direction,
      reason,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    throw error
  }

  if (!outcome.ok) fail(outcome.error)

  if (returnTo === "users") {
    revalidatePath("/management/users")
    redirect("/management/users?ok=1")
  }

  const target = outcome.accountId === "" ? accountId : outcome.accountId
  if (target !== "") {
    revalidatePath(`/management/users/${target}`)
    redirect(`/management/users/${target}?ok=1`)
  }

  redirect("/management/users")
}

export async function saveVipOverride(formData: FormData): Promise<void> {
  const accountId = String(formData.get("accountId") ?? "")
  const markupPercent = Number(String(formData.get("markupPercent") ?? ""))
  const note = String(formData.get("note") ?? "")

  const fail = (code: string): never => {
    redirect(accountId === "" ? "/management/users" : `/management/users/${accountId}?overrideError=${code}`)
  }

  if (accountId === "") fail("account")
  if (!Number.isFinite(markupPercent) || markupPercent < 0) fail("invalid")

  try {
    await (await serverApi()).post(`/api/admin/users/${encodeURIComponent(accountId)}/markup-override`, {
      markupPercent,
      note,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    if (error instanceof ApiError) fail(error.message)
    throw error
  }

  revalidatePath(`/management/users/${accountId}`)
  redirect(`/management/users/${accountId}?overrideOk=1`)
}

export async function clearVipOverride(formData: FormData): Promise<void> {
  const accountId = String(formData.get("accountId") ?? "")
  if (accountId === "") redirect("/management/users")

  try {
    await (await serverApi()).delete(`/api/admin/users/${encodeURIComponent(accountId)}/markup-override`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    if (error instanceof ApiError) redirect(`/management/users/${accountId}?overrideError=${error.message}`)
    throw error
  }

  revalidatePath(`/management/users/${accountId}`)
  redirect(`/management/users/${accountId}?overrideOk=1`)
}
