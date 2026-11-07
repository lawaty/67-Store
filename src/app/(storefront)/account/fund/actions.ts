"use server"
/**
 * Fund wallet server action: starts a wallet funding through the API and
 * redirects to the payment page or back to the funding form with an error.
 */
import { redirect } from "next/navigation"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"

export async function startFunding(formData: FormData): Promise<void> {
  const currency = String(formData.get("currency") ?? "")
  const amountMinor = Number(String(formData.get("amountMinor") ?? ""))

  let redirectUrl: string
  try {
    const result = await (await serverApi()).post<{ redirectUrl: string }>("/api/account/fund", {
      currency,
      amountMinor,
    })
    redirectUrl = result.redirectUrl
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirectUrl = "/account/login"
      } else {
        redirectUrl = `/account/fund?error=${error.code}&currency=${currency}&amount=${amountMinor / 100}`
      }
    } else {
      throw error
    }
  }

  redirect(redirectUrl)
}
