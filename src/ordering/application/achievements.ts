/**
 * Records managed achievement progress lazily when an account is read.
 * Evaluation is idempotent: an achievement keeps its original earn time once
 * earned, and counts are recomputed from the order aggregates on every call.
 */
import type { AchievementRule, ClientAchievementProgress } from "../domain/achievement"

export type AchievementRecorderDeps = {
  listActive: () => Promise<readonly AchievementRule[]>
  listProgress: (clientId: string) => Promise<readonly ClientAchievementProgress[]>
  upsertProgress: (input: { clientId: string; achievementId: string; count: number; earnedAt: string | null }) => Promise<void>
  countByClient: (clientId: string, since: string | null) => Promise<number>
}

export type RecordedAchievement = {
  readonly rule: AchievementRule
  readonly count: number
  readonly earnedAt: string | null
}

export function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export function startOfWeekUtc(now: Date): Date {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const daysSinceMonday = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  return start
}

export async function recordAchievements(
  deps: AchievementRecorderDeps,
  clientId: string,
  now: Date,
): Promise<RecordedAchievement[]> {
  const rules = await deps.listActive()
  if (rules.length === 0) {
    return []
  }

  const progress = await deps.listProgress(clientId)
  const priorById = new Map(progress.map((entry) => [entry.achievementId, entry]))

  const needsTotal = rules.some((rule) => rule.type === "TOTAL_ORDERS")
  const needsMonth = rules.some((rule) => rule.type === "ORDERS_PER_MONTH")
  const needsWeek = rules.some((rule) => rule.type === "ORDERS_PER_WEEK")

  const [total, month, week] = await Promise.all([
    needsTotal ? deps.countByClient(clientId, null) : Promise.resolve(0),
    needsMonth ? deps.countByClient(clientId, startOfMonthUtc(now).toISOString()) : Promise.resolve(0),
    needsWeek ? deps.countByClient(clientId, startOfWeekUtc(now).toISOString()) : Promise.resolve(0),
  ])

  const recorded: RecordedAchievement[] = []
  for (const rule of rules) {
    const count =
      rule.type === "TOTAL_ORDERS" ? total : rule.type === "ORDERS_PER_MONTH" ? month : week
    const prior = priorById.get(rule.id)
    const earnedAt = prior?.earnedAt ?? (count >= rule.target ? now.toISOString() : null)
    await deps.upsertProgress({ clientId, achievementId: rule.id, count, earnedAt })
    recorded.push({ rule, count, earnedAt })
  }
  return recorded
}
