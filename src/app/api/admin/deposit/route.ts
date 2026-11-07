/**
 * `POST /api/admin/deposit` — records a client deposit in the given currency
 * and amount; requires the admin cookie.
 */
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { recordDeposit } from "@/api/admin"
import { failure, json } from "@/api/http"
import { isCurrencyCode } from "@/shared/money"

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const clientId = typeof body.clientId === "string" ? body.clientId : null
  const currency = typeof body.currency === "string" ? body.currency : null
  const amountMinor = Number(body.amountMinor)

  if (
    clientId === null ||
    currency === null ||
    !isCurrencyCode(currency) ||
    (currency !== "EGP" && currency !== "USD") ||
    !Number.isFinite(amountMinor)
  ) {
    return failure("bad_request", 400)
  }

  const result = await recordDeposit(getContainer(), {
    clientId,
    currency,
    amountMinor,
  })

  return result.ok ? json(result) : failure(result.error, 400)
}
