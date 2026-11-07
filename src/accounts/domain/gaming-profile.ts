/**
 * Immutable saved gaming profile linking an account to game/player identifiers.
 * Requires non-empty label, user, server, and game; normalizes blank player name to null.
 */
export type GamingProfile = {
  readonly id: string
  readonly accountId: string
  readonly label: string
  readonly userId: string
  readonly serverId: string
  readonly game: string
  readonly playerName: string | null
  readonly createdAt: string | null
}

export function gamingProfile(input: {
  id: string
  accountId: string
  label: string
  userId: string
  serverId: string
  game: string
  playerName?: string | null
  createdAt?: Date | string | null
}): GamingProfile {
  const id = input.id.trim()
  const accountId = input.accountId.trim()
  const label = input.label.trim()
  const userId = input.userId.trim()
  const serverId = input.serverId.trim()
  const game = input.game.trim()
  const playerName = (input.playerName ?? "").trim()

  if (label.length === 0 || userId.length === 0 || serverId.length === 0 || game.length === 0) {
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
    accountId,
    label,
    userId,
    serverId,
    game,
    playerName: playerName === "" ? null : playerName,
    createdAt,
  })
}
