/**
 * `GET/POST /api/account/fund` — quotes or starts a wallet funding for the
 * authenticated account session.
 */
import { getContainer } from "@/api/container"
import { sessionFromRequest } from "@/api/auth"
import { quoteWalletFunding, startWalletFunding } from "@/api/wallet-funding"
import { failure, json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  if (session === null) return failure("unauthorized", 401)

  const params = new URL(request.url).searchParams
  const currency = params.get("currency")
  const amountRaw = params.get("amountMinor")
  const amountMinor = amountRaw === null ? null : Number(amountRaw)

  const result = await quoteWalletFunding(getContainer(), { currency, amountMinor })
  return result.ok ? json(result.quote) : failure(result.error, 400)
}

export async function POST(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  if (session === null) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const result = await startWalletFunding(getContainer(), {
    clientId: session.clientId,
    currency: body.currency,
    amountMinor: body.amountMinor,
  })
  return result.ok ? json({ ok: true, redirectUrl: result.redirectUrl }) : failure(result.error, 400)
}
