"use server"
/**
 * Handles admin treasury form posts for funding, enforces auth checks, and
 * revalidates the treasury route.
 */

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import { majorToMinor } from "@/shared/money"

export async function recordFunding(formData: FormData): Promise<void> {
  const egpMajor = Number(String(formData.get("egpPaid") ?? ""))
  const usdtMajor = Number(String(formData.get("usdt") ?? ""))

  if (
    !Number.isFinite(egpMajor) ||
    egpMajor <= 0 ||
    !Number.isFinite(usdtMajor) ||
    usdtMajor <= 0
  ) {
    redirect("/management/treasury?error=1")
  }

  const egpPaidMinor = majorToMinor(egpMajor, "EGP")
  const usdtMilli = Math.round(usdtMajor * 1000)

  if (!Number.isSafeInteger(egpPaidMinor) || egpPaidMinor <= 0 || !Number.isSafeInteger(usdtMilli) || usdtMilli <= 0) {
    redirect("/management/treasury?error=1")
  }

  try {
    const result = await (await serverApi()).post<{ ok: boolean }>("/api/admin/funding", {
      egpPaidMinor,
      usdtMilli,
    })
    if (!result.ok) redirect("/management/treasury?error=1")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    if (error instanceof ApiError && error.code === "exceeds_free") redirect("/management/treasury?error=free")
    if (error instanceof ApiError) redirect("/management/treasury?error=1")
    throw error
  }

  revalidatePath("/management/treasury")
  redirect("/management/treasury?ok=1")
}

export async function rollbackFunding(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "")
  if (id === "") {
    redirect("/management/treasury?error=1")
  }
  try {
    await (await serverApi()).delete(`/api/admin/funding/${encodeURIComponent(id)}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    if (error instanceof ApiError && error.code === "locked") redirect("/management/treasury?error=locked")
    if (error instanceof ApiError && error.code === "not_found") redirect("/management/treasury?error=not_found")
    if (error instanceof ApiError) redirect("/management/treasury?error=1")
    throw error
  }
  revalidatePath("/management/treasury")
  revalidatePath("/management")
  redirect("/management/treasury?ok=rolledback")
}