/**
 * `POST /api/checkout` — starts a checkout for a product and payment method using
 * an optional account cookie session (guest allowed); may trigger fulfilment.
 */

import { randomUUID } from "node:crypto"
import { getContainer } from "@/api/container"
import { sessionFromRequest } from "@/api/auth"
import { checkout, type CheckoutMethod } from "@/api/checkout"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function method(value: unknown): CheckoutMethod {
  return value === "usdt" ? "usdt" : value === "coins" ? "coins" : "egp"
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)
  const productId = body.productId
  if (typeof productId !== "string") return failure("bad_request", 400)

  const session = sessionFromRequest(request)
  const container = getContainer()

  const result = await checkout(
    container,
    session === null
      ? { accountId: null, clientId: null }
      : { accountId: session.accountId, clientId: session.clientId },
    {
      productId,
      method: method(body.method),
      profileId: text(body.profileId),
      userId: text(body.userId),
      serverId: text(body.serverId),
      promoCode: text(body.promoCode),
      locale: text(body.locale),
      termsAccepted: body.termsAccepted === true,
    },
    { newId: randomUUID, allowFakeFulfilment: container.fakeFulfilmentEnabled() },
  )

  return json(result)
}
