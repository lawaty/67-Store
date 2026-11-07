/**
 * Declares the persistence capability for earned level achievements:
 * the first earn for a (clientId, levelKey) wins and badges survive demotion.
 */
export type EarnedLevel = {
  readonly levelKey: string
  readonly coins: number
  readonly title: string
  readonly icon: string
  readonly color: string
  readonly earnedAt: string
}

export type EarnLevelInput = {
  readonly clientId: string
  readonly levelKey: string
  readonly coins: number
  readonly title: string
  readonly icon: string
  readonly color: string
  readonly earnedAt: string
}

export interface LevelAchievementRepository {
  earn(input: EarnLevelInput): Promise<void>
  listByClient(clientId: string): Promise<EarnedLevel[]>
}
