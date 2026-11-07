/**
 * Reads a client's qualifying volume for VIP markup resolution.
 * The window covers deposit coins plus delivered orders not paid with coins,
 * over a fixed rolling 30×24h span from `now`; non-finite or negative sums
 * read as zero, and a null client (guest) is never queried.
 */
import type { ActivityRepository } from "../ports/activity-repository"

export const VIP_WINDOW_DAYS = 30

export function vipWindowStart(now: Date): Date {
  return new Date(now.getTime() - VIP_WINDOW_DAYS * 24 * 60 * 60 * 1000)
}

export async function readQualifyingVolume(
  activity: Pick<ActivityRepository, "sumQualifiedVolumeSince">,
  clientId: string | null,
  now: Date,
): Promise<number> {
  if (clientId === null) return 0
  const sum = await activity.sumQualifiedVolumeSince(clientId, vipWindowStart(now))
  if (!Number.isFinite(sum) || sum < 0) return 0
  return sum
}
