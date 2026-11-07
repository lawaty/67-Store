/**
 * Read-only player verification shared by the storefront forms and the
 * checkout/profile flows. Nothing is persisted here.
 */
import type { Container } from "@/container"
import { player } from "@/ordering"
import type { PlayerCheckDto } from "./contracts"

export class PlayerCheckUnavailableError extends Error {
  constructor() {
    super("player_unverified")
  }
}

export async function checkPlayer(
  c: Container,
  input: { readonly game: string; readonly userId: string; readonly serverId: string },
): Promise<PlayerCheckDto> {
  const target = player(input.userId, input.serverId)
  const game = input.game.trim() === "" ? "mlbb" : input.game.trim()
  try {
    return await c.distributor.checkPlayer({ game, player: target })
  } catch {
    throw new PlayerCheckUnavailableError()
  }
}
