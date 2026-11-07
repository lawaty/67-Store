/**
 * `POST /api/admin/wallet` — adjusts a client or account wallet balance; requires
 * the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { adjustWallet } from "@/api/admin"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const outcome = await adjustWallet(getContainer(), {
    clientId: text(body.clientId),
    accountId: text(body.accountId),
    amount: Number(body.amount),
    direction: text(body.direction),
    reason: text(body.reason),
  })

  return json(outcome)
}
