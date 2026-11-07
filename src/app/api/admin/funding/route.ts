/**
 * `POST /api/admin/funding` — records treasury funding with total EGP paid
 * (including fees) and USDT received; requires the admin cookie.
 */
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { recordFunding } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const egpPaidMinor = Number(body.egpPaidMinor)
  const usdtMinor = Number(body.usdtMinor)

  if (
    !Number.isSafeInteger(egpPaidMinor) ||
    !Number.isSafeInteger(usdtMinor) ||
    egpPaidMinor <= 0 ||
    usdtMinor <= 0
  ) {
    return failure("bad_request", 400)
  }

  const result = await recordFunding(getContainer(), {
    egpPaidMinor,
    usdtMinor,
  })

  return result.ok ? json({ ok: true }) : failure(result.error, 400)
}
