/**
 * `POST /api/account/preference` — saves the player's selected user/server IDs
 * for the authenticated account session.
 */
import { getContainer } from "@/api/container"
import { sessionFromRequest } from "@/api/auth"
import { savePreference } from "@/api/account"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function POST(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  if (session === null) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  await savePreference(getContainer(), session, text(body.userId), text(body.serverId))
  return json({ ok: true })
}
