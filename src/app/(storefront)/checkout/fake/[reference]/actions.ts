"use server"
/**
 * Fake checkout server action for /checkout/fake/[reference]: handles the test payment form post.
 * Submits the payment reference and redirects to the order page token.
 */

import { redirect } from "next/navigation"
import { serverApi } from "@/frontend/server"

export async function payFake(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "")
  const token = String(formData.get("token") ?? "")

  const result = await (await serverApi()).post<{ ok: boolean; redirectUrl: string | null }>(
    `/api/payments/fake/${encodeURIComponent(reference)}`,
  )
  if (typeof result.redirectUrl === "string" && result.redirectUrl !== "") {
    redirect(result.redirectUrl)
  }
  if (token !== "") {
    redirect(`/order/${token}`)
  }
  redirect("/account")
}
