/**
 * `POST /api/jobs/poll` — polls pending orders and triggers fulfilment sync;
 * requires the `x-jobs-secret` header (job secret).
 */

import { timingSafeEqual } from "node:crypto"
import { getContainer } from "@/api/container"
import { readEnv } from "@/env"
import { createPollOrders } from "@/jobs"

export async function POST(request: Request): Promise<Response> {
  const env = readEnv(process.env as Record<string, string | undefined>)

  if (env.jobsSecret === "") {
    return new Response("jobs secret not configured", { status: 503 })
  }

  const provided = request.headers.get("x-jobs-secret") ?? ""
  const a = Buffer.from(provided)
  const b = Buffer.from(env.jobsSecret)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response(null, { status: 401 })
  }

  const container = getContainer()
  const poll = createPollOrders({ orders: container.orders, syncFulfilment: container.syncFulfilment })
  const result = await poll()
  return Response.json(result, { status: 200 })
}
