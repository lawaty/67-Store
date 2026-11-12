/**
 * Immutable achievement rule defining a client milestone and its progress target.
 * Requires non-empty id, title, description, icon, color, and type; target must be a positive integer.
 */
export type AchievementType = "TOTAL_ORDERS" | "ORDERS_PER_MONTH" | "ORDERS_PER_WEEK"

export type AchievementRule = {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly icon: string
  readonly color: string
  readonly type: AchievementType
  readonly target: number
  readonly active: boolean
  readonly sortOrder: number
}

export type ClientAchievementProgress = {
  readonly achievementId: string
  readonly count: number
  readonly earnedAt: string | null
}

export function achievementRule(input: {
  id: string
  title: string
  description: string
  icon: string
  color: string
  type: AchievementType
  target: number
  active?: boolean
  sortOrder?: number
}): AchievementRule {
  const id = input.id.trim()
  const title = input.title.trim()
  const description = input.description.trim()
  const icon = input.icon.trim()
  const color = input.color.trim()
  const type = input.type.trim()

  if (
    id.length === 0 ||
    title.length === 0 ||
    description.length === 0 ||
    icon.length === 0 ||
    color.length === 0 ||
    type.length === 0
  ) {
    throw new RangeError()
  }

  if (!Number.isInteger(input.target) || input.target <= 0) {
    throw new RangeError()
  }

  return Object.freeze({
    id,
    title,
    description,
    icon,
    color,
    type: type as AchievementType,
    target: input.target,
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
  })
}
