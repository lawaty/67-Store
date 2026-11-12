/**
 * POST /api/webhooks/g2bulk accepts G2Bulk order webhooks. Verifies the
 * signature, syncs fulfilment for matched orders, and then records the delivery.
 */
import { getContainer } from "@/api/container"
import { readEnv } from "@/env"
import { verifyWebhookSignature } from "@/integration/g2bulk/webhook-signature"

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const env = readEnv(process.env as Record<string, string | undefined>)

  const verified = verifyWebhookSignature({
    secret: env.g2bulkWebhookSecret,
    webhookId: request.headers.get("webhook-id") ?? "",
    timestamp: request.headers.get("webhook-timestamp") ?? "",
    body,
    signature: request.headers.get("webhook-signature") ?? "",
  })
  if (!verified) {
    return new Response("invalid signature", { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response("invalid body", { status: 400 })
  }

  const container = getContainer()
  const record = payload as Record<string, unknown>
  const eventId =
    typeof record.id === "string" ? record.id : (request.headers.get("webhook-id") ?? "")
  if (eventId === "") {
    return new Response("missing event id", { status: 400 })
  }

  const data = (record.data ?? record) as Record<string, unknown>
  const distributorOrderId = data.order_id ?? data.id
  if (typeof distributorOrderId === "string" || typeof distributorOrderId === "number") {
    const order = await container.orders.findByDistributorOrderId(String(distributorOrderId))
    if (order !== null) {
      await container.syncFulfilment(order)
    }
  }

  // Record only after the event has been applied: recording first turns a
  // retry of a failed sync into a duplicate that is acked and dropped. The
  // sync is intentionally left unguarded so an unexpected failure returns 500
  // and the distributor retries; the unique WebhookEvent.eventId constraint
  // still prevents duplicate audit rows.
  await container.webhookEvents.record("g2bulk", eventId, payload)

  return new Response("ok")
}
