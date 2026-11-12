/**
 * Declares gaming profile persistence capabilities for the application layer.
 * Supports listing, adding, and removing saved profiles for an account.
 */
import { GamingProfile } from "../domain/gaming-profile"

export interface GamingProfileRepository {
  listByAccount(accountId: string): Promise<GamingProfile[]>
  add(input: { id: string; clientId: string; accountId: string | null; userId: string; serverId: string; game: string; playerName?: string | null }): Promise<GamingProfile>
  remove(id: string, accountId: string): Promise<void>
}
