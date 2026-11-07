/**
 * `GET /api/account` — returns the authenticated account's data; requires an
 * account session cookie.
 */
import { getContainer } from "@/api/container"
import { sessionFromRequest } from "@/api/auth"
import { readAccount } from "@/api/account"
import { failure, json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  if (session === null) return failure("unauthorized", 401)

  const account = await readAccount(getContainer(), session)
  return account === null ? failure("not_found", 404) : json(account)
}
