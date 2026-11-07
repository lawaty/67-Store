/**
 * GET /api/storefront returns storefront data for an optional session account
 * and requested audience (`client` or default). Public/authenticated read, no writes.
 */
import { getContainer } from "@/api/container"
import { sessionFromRequest } from "@/api/auth"
import { readStorefront } from "@/api/storefront"
import { json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  const audience = new URL(request.url).searchParams.get("audience") === "client" ? "client" : "default"

  const storefront = await readStorefront(
    getContainer(),
    session === null
      ? { accountId: null, clientId: null }
      : { accountId: session.accountId, clientId: session.clientId },
    audience,
  )

  return json(storefront)
}
