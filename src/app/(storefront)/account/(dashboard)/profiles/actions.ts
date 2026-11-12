"use server"
/**
 * Profile server actions for /account/profiles: handle add, remove, and
 * default-player preference posts. Revalidates account/profile paths and
 * redirects with success or error state.
 */

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"

export async function addProfile(formData: FormData): Promise<void> {
  try {
    await (await serverApi()).post("/api/account/profiles", {
      
      game: String(formData.get("game") ?? "mlbb"),
      userId: String(formData.get("userId") ?? ""),
      serverId: String(formData.get("serverId") ?? ""),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/account/login")
    if (error instanceof ApiError && (error.code === "player_invalid" || error.code === "invalid")) {
      redirect("/account/profiles?error=player")
    }
    if (error instanceof ApiError && error.code === "player_unverified") {
      redirect("/account/profiles?error=verify")
    }
    redirect("/account/profiles?error=1")
  }

  revalidatePath("/account")
  revalidatePath("/account/profiles")
  redirect("/account/profiles?saved=1")
}

export async function removeProfile(formData: FormData): Promise<void> {
  const profileId = String(formData.get("profileId") ?? "")

  try {
    await (await serverApi()).delete(`/api/account/profiles?id=${encodeURIComponent(profileId)}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/account/login")
    throw error
  }

  revalidatePath("/account")
  revalidatePath("/account/profiles")
  redirect("/account/profiles?removed=1")
}

export async function savePlayerPreference(formData: FormData): Promise<void> {
  const userId = String(formData.get("userId") ?? "")
  const serverId = String(formData.get("serverId") ?? "")

  try {
    await (await serverApi()).post("/api/account/preference", { userId, serverId })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/account/login")
    throw error
  }

  revalidatePath("/account")
  revalidatePath("/account/profiles")
  redirect("/account/profiles")
}

