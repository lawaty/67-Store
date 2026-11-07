"use server"
/**
 * Handles admin coin-deposit form posts, enforces auth checks, and
 * revalidates the coin-deposits route.
 */

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import { majorToMinor } from "@/shared/money"

export async function recordDeposit(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "")
  const currency = String(formData.get("currency") ?? "")
  const amount = Number(String(formData.get("amount") ?? ""))

  if (currency !== "EGP" && currency !== "USD") {
    redirect("/management/coins?error=deposit")
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect("/management/coins?error=deposit")
  }

  const amountMinor = majorToMinor(amount, currency as "EGP" | "USD")
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    redirect("/management/coins?error=deposit")
  }

  try {
    const result = await (await serverApi()).post<{ ok: boolean }>("/api/admin/deposit", {
      clientId,
      currency,
      amountMinor,
    })
    if (!result.ok) redirect("/management/coins?error=deposit")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    if (error instanceof ApiError) redirect("/management/coins?error=deposit")
    throw error
  }

  revalidatePath("/management/coins")
  redirect("/management/coins?ok=deposit")
}
