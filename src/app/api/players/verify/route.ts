/**
 * `POST /api/players/verify` — read-only player-id verification for storefront
 * forms. Public (guests can check out); never writes a profile or order.
 */
import { getContainer } from "@/api/container"
import { checkPlayer, PlayerCheckUnavailableError } from "@/api/players"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  try {
    return json(
      await checkPlayer(getContainer(), {
        game: text(body.game),
        userId: text(body.userId),
        serverId: text(body.serverId),
      }),
    )
  } catch (error) {
    if (error instanceof RangeError) return failure("invalid", 400)
    if (error instanceof PlayerCheckUnavailableError) return failure("player_unverified", 503)
    throw error
  }
}
