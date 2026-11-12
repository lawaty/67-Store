"use server"

/**
 * Handles the admin catalogue-sync form post, redirects unauthenticated requests
 * to login, and revalidates the home and management routes after success.
 */

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"

export async function syncCatalogue(): Promise<void> {
  try {
    await (await serverApi()).post("/api/admin/sync")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    throw error
  }

  revalidatePath("/")
  revalidatePath("/management")
  redirect("/management")
}

export async function saveBaseMarkup(formData: FormData): Promise<void> {
  const markupPercent = Number(String(formData.get("markupPercent") ?? ""))

  try {
    await (await serverApi()).post("/api/admin/markup", { markupPercent })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    throw error
  }

  revalidatePath("/management")
  redirect("/management")
}

export async function saveCoinIndexCap(formData: FormData): Promise<void> {
  const coinIndexCapBps = Number(String(formData.get("coinIndexCapBps") ?? ""))

  try {
    await (await serverApi()).post("/api/admin/settings/coin-index-cap", { coinIndexCapBps })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    throw error
  }

  revalidatePath("/management")
  redirect("/management")
}

export async function saveVipCurve(formData: FormData): Promise<void> {
  const levels = formData.getAll("levelKey").map((key, i) => ({
    key: String(key),
    title: String(formData.getAll("levelTitle")[i] ?? ""),
    coins: String(formData.getAll("levelCoins")[i] ?? ""),
    percent: String(formData.getAll("levelPercent")[i] ?? ""),
    icon: String(formData.getAll("levelIcon")[i] ?? ""),
    color: String(formData.getAll("levelColor")[i] ?? ""),
  }))

  try {
    await (await serverApi()).post("/api/admin/settings/vip-curve", { levels })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    throw error
  }

  revalidatePath("/management")
  revalidatePath("/management/levels")
  redirect("/management/levels")
}

export async function saveP2pSettings(formData: FormData): Promise<void> {
  const windowHours = Number(String(formData.get("windowHours") ?? ""))
  const syncIntervalSeconds = Number(String(formData.get("syncIntervalSeconds") ?? ""))
  const outlierSigma = Number(String(formData.get("outlierSigma") ?? ""))

  try {
    await (await serverApi()).post("/api/admin/settings/p2p", { windowHours, syncIntervalSeconds, outlierSigma })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    throw error
  }

  revalidatePath("/management")
  redirect("/management")
}


