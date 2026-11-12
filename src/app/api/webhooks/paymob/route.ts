/**
 * POST /api/webhooks/paymob accepts Paymob transaction callbacks. Verifies the
 * HMAC, guards amount/currency, confirms payment status (and fulfils paid
 * orders) for the matched payment, and records delivery after processing.
 */
import { getContainer } from "@/api/container"
import { readEnv } from "@/env"
import { verifyPaymobHmac } from "@/integration/paymob/webhook-signature"

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null
  return value as Record<string, unknown>
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text()
  const hmac = new URL(request.url).searchParams.get("hmac") ?? ""
  if (hmac === "") {
    return new Response("missing hmac", { status: 400 })
  }

  const env = readEnv(process.env as Record<string, string | undefined>)
  if (env.paymobHmacSecret === "") {
    return new Response("paymob hmac secret not configured", { status: 503 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return new Response("invalid body", { status: 400 })
  }

  const body = asRecord(parsed)
  const transaction = body ? asRecord(body.obj) : null
  if (transaction === null) {
    return new Response("invalid body", { status: 400 })
  }

  const verified = verifyPaymobHmac({ hmac, transaction, secret: env.paymobHmacSecret })
  if (!verified) {
    return new Response("invalid signature", { status: 401 })
  }

  const transactionId = transaction.id
  const orderObj = asRecord(transaction.order)
  const eventId =
    transactionId !== null && transactionId !== undefined && String(transactionId) !== ""
      ? String(transactionId)
      : String(orderObj?.id ?? "")
  if (eventId === "") {
    return new Response("missing event id", { status: 400 })
  }

  const container = getContainer()

  const reference = String(orderObj?.merchant_order_id ?? "").trim()
  if (reference === "") {
    return new Response("missing reference", { status: 400 })
  }

  const payment = await container.payments.findByProviderReference("PAYMOB", reference)
  if (payment === null) {
    return new Response("unknown payment", { status: 404 })
  }

  if (Number(transaction.amount_cents) !== payment.amount.minor || transaction.currency !== payment.amount.currency) {
    return new Response("amount mismatch", { status: 400 })
  }

  const status = transaction.success === true ? "PAID" : "FAILED"
  const order = await container.confirmPayment({ provider: "PAYMOB", reference, status })
  if (status === "PAID" && order !== null && order.status === "PAID") {
    try {
      await container.fulfilOrder(order)
    } catch (error) {
      console.error("paymob fulfilment failed", error)
    }
  }

  // Record only after the event has been validated and applied. Recording
  // first would make a retry of a failed delivery look like a duplicate and
  // drop the callback for good. `confirmPayment` is idempotent by payment
  // status, so reprocessing a duplicate delivery is safe; the unique
  // WebhookEvent.eventId constraint still prevents duplicate audit rows.
  await container.webhookEvents.record("paymob", eventId, parsed)

  return new Response("ok")
}
