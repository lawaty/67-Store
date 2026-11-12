/**
 * `GET/POST/DELETE /api/account/profiles` — lists, adds, or removes saved
 * player profiles for the authenticated account session.
 */
import { randomUUID } from "node:crypto"
import { getContainer } from "@/api/container"
import { sessionFromRequest } from "@/api/auth"
import {
  addProfile,
  InvalidPlayerError,
  listProfiles,
  PlayerVerificationError,
  removeProfile,
} from "@/api/account"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function GET(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  if (session === null) return failure("unauthorized", 401)
  return json(await listProfiles(getContainer(), session))
}

export async function POST(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  if (session === null) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  try {
    await addProfile(
      getContainer(),
      session,
      {
        
        game: text(body.game),
        userId: text(body.userId),
        serverId: text(body.serverId),
      },
      randomUUID,
    )
    return json({ ok: true })
  } catch (error) {
    if (error instanceof InvalidPlayerError) return failure("player_invalid", 400)
    if (error instanceof PlayerVerificationError) return failure("player_unverified", 503)
    if (error instanceof RangeError) return failure("invalid", 400)
    throw error
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const session = sessionFromRequest(request)
  if (session === null) return failure("unauthorized", 401)

  const id = new URL(request.url).searchParams.get("id")
  if (id === null || id === "") return failure("bad_request", 400)

  await removeProfile(getContainer(), session, id)
  return json({ ok: true })
}
