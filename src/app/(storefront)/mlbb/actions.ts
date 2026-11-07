"use server"
/**
 * Server actions handling checkout submission and profile creation from the MLBB top-up form.
 */
import { redirect } from "next/navigation"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"
import type { CheckoutResultDto } from "@/api/contracts"
import { getLocale } from "@/i18n/server"

function safeReturnTo(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/products"
}

export async function startCheckout(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? "/products"))
  const method = formData.get("method")
  const locale = await getLocale()

  const result = await (await serverApi()).post<CheckoutResultDto>("/api/checkout", {
    productId: String(formData.get("product") ?? ""),
    method: method === null ? "egp" : String(method),
    profileId: String(formData.get("profileId") ?? ""),
    label: String(formData.get("label") ?? ""),
    userId: String(formData.get("userId") ?? ""),
    serverId: String(formData.get("serverId") ?? ""),
    promoCode: String(formData.get("promoCode") ?? ""),
    locale,
  })

  if (result.ok) redirect(result.redirectUrl)
  if (result.error === "login") redirect("/account/login?next=" + encodeURIComponent(returnTo))
  redirect(returnTo + "?error=" + result.error)
}

export async function addProfileFromTopup(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? "/products"))

  try {
    await (await serverApi()).post("/api/account/profiles", {
      label: String(formData.get("label") ?? ""),
      game: String(formData.get("game") ?? "mlbb"),
      userId: String(formData.get("userId") ?? ""),
      serverId: String(formData.get("serverId") ?? ""),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/account/login?next=" + encodeURIComponent(returnTo))
    }
    redirect(returnTo + "?error=profile")
  }

  redirect(returnTo + "?saved=1")
}
