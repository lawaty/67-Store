"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"

export async function saveGateways(formData: FormData): Promise<void> {
  const card = formData.get("card") === "on"
  const wallet = formData.get("wallet") === "on"
  const crypto = formData.get("crypto") === "on"
  const coins = formData.get("coins") === "on"
  const fulfilmentEnabled = formData.get("fulfilmentEnabled") === "on"

  try {
    await (await serverApi()).post("/api/admin/settings/gateways", {
      card,
      wallet,
      crypto,
      coins,
      fulfilmentEnabled,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    redirect("/management/settings?error=gateways")
  }

  revalidatePath("/management/settings")
  redirect("/management/settings?ok=gateways")
}
