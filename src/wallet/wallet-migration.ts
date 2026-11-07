/**
 * Defines contracts for migrating wallet balances and records the migration
 * reason; conversion is intended to be idempotent per wallet.
 */
export type WalletSnapshot = {
  readonly id: string
  readonly clientId: string
  readonly coinBalance: number
}

export interface WalletMigrationRepository {
  listUnconvertedPage(cursor: string | null, limit: number): Promise<{ wallets: WalletSnapshot[]; nextCursor: string | null }>
  convert(input: { walletId: string; newCoins: number; reason: string }): Promise<boolean>
}

export const MIGRATION_REASON = "migration:coins_to_usdt"
