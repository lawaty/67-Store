/**
 * Records earned level achievements lazily when a profile is read.
 * Evaluation is lazy and idempotent: repeated calls are safe because the
 * unique (clientId, levelKey) key makes the first earn win, and badges
 * survive demotion.
 */
import { validateLevels, type LevelSet } from "../domain/level"
import type { EarnedLevel, LevelAchievementRepository } from "../ports/level-achievement-repository"

function sanitizeVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 0
  }
  if (volume < 0) {
    return 0
  }
  return volume
}

export async function recordLevelAchievements(
  deps: Pick<LevelAchievementRepository, "earn" | "listByClient">,
  clientId: string,
  levels: LevelSet,
  volume: number,
  now: Date,
): Promise<readonly EarnedLevel[]> {
  validateLevels(levels)
  const sanitizedVolume = sanitizeVolume(volume)
  const earnedAt = now.toISOString()
  for (const level of levels) {
    if (level.coins <= sanitizedVolume) {
      await deps.earn({
        clientId,
        levelKey: level.key,
        coins: level.coins,
        title: level.title,
        icon: level.icon,
        color: level.color,
        earnedAt,
      })
    }
  }
  return deps.listByClient(clientId)
}
