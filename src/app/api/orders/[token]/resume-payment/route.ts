import { randomUUID } from "node:crypto"
import { getContainer } from "@/api/container"
import { sessionFromRequest } from "@/api/auth"
import { resumeOrderPayment } from "@/api/orders"
import type { ResumePaymentMethod } from "@/api/contracts"
import { failure, json } from "@/api/http"

function method(value: unknown): ResumePaymentMethod {
  return value === "usdt" ? "usdt" : value === "coins" ? "coins" : "egp"
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)
  const { token } = await context.params
  const session = sessionFromRequest(request)
  const container = getContainer()
  const result = await resumeOrderPayment(container, token, method(body.method), {
    session,
    newId: randomUUID,
  })
  return json(result)
}
