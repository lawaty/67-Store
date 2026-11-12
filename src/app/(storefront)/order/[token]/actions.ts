"use server"
import { redirect } from "next/navigation"
import { serverApi } from "@/frontend/server"
import type { ResumePaymentResultDto } from "@/api/contracts"

export async function resumePayment(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "")
  const raw = String(formData.get("method") ?? "egp")
  const method = raw === "usdt" ? "usdt" : raw === "coins" ? "coins" : "egp"
  const result = await (await serverApi()).post<ResumePaymentResultDto>(
    `/api/orders/${encodeURIComponent(token)}/resume-payment`,
    { method },
  )
  if (result.ok) redirect(result.redirectUrl)
  redirect(`/order/${encodeURIComponent(token)}?resume=${encodeURIComponent(result.error)}`)
}
