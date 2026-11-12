/**
 * Declares the persistence capability for achievement rules and per-client
 * progress: the catalog of milestones and each client's count/earned state.
 */
import type { AchievementRule, ClientAchievementProgress } from "../domain/achievement"

export type NewAchievement = { readonly id: string } & Omit<AchievementRule, "id">
export type UpdateAchievement = Omit<AchievementRule, "id">

export interface AchievementRepository {
  listAll(): Promise<AchievementRule[]>
  listActive(): Promise<AchievementRule[]>
  create(input: NewAchievement): Promise<AchievementRule>
  update(id: string, input: UpdateAchievement): Promise<AchievementRule>
  remove(id: string): Promise<void>
  listProgress(clientId: string): Promise<ClientAchievementProgress[]>
  upsertProgress(input: { clientId: string; achievementId: string; count: number; earnedAt: string | null }): Promise<void>
}
