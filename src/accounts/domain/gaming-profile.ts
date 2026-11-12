/**
 * Immutable saved gaming profile linking a client/account to game/player identifiers.
 * Requires non-empty clientId, user, server, and game; normalizes blank player name to null.
 */
export type GamingProfile = {
  readonly id: string
  readonly clientId: string
  readonly accountId: string | null
  readonly userId: string
  readonly serverId: string
  readonly game: string
  readonly playerName: string | null
  readonly createdAt: string | null
}

export function gamingProfile(input: {
  id: string
  clientId: string
  accountId?: string | null
  userId: string
  serverId: string
  game: string
  playerName?: string | null
  createdAt?: Date | string | null
}): GamingProfile {
  const id = input.id.trim()
  const clientId = input.clientId.trim()
  const accountId = input.accountId == null ? null : input.accountId.trim()
  const userId = input.userId.trim()
  const serverId = input.serverId.trim()
  const game = input.game.trim()
  const playerName = (input.playerName ?? "").trim()

  if (clientId.length === 0 || userId.length === 0 || serverId.length === 0 || game.length === 0) {
    throw new RangeError()
  }

  let createdAt: string | null = null
  if (input.createdAt instanceof Date) {
    createdAt = input.createdAt.toISOString()
  } else if (typeof input.createdAt === "string" && input.createdAt.length > 0) {
    createdAt = input.createdAt
  }

  return Object.freeze({
    id,
    clientId,
    accountId: accountId === "" ? null : accountId,
    userId,
    serverId,
    game,
    playerName: playerName === "" ? null : playerName,
    createdAt,
  })
}
