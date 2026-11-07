/**
 * Validates and normalizes player identifiers, requiring non-empty trimmed
 * game user and server (zone) ids.
 */
export type Player = { readonly userId: string; readonly serverId: string }

export function player(userId: string, serverId: string): Player {
  const trimmedUserId = userId.trim()
  const trimmedServerId = serverId.trim()
  if (trimmedUserId === "") {
    throw new RangeError()
  }
  if (trimmedServerId === "") {
    throw new RangeError()
  }
  return Object.freeze({ userId: trimmedUserId, serverId: trimmedServerId })
}
