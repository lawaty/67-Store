/**
 * Prisma adapter for `WalletMigrationRepository`: paginates unconverted wallets
 * and converts them idempotently by migration reason, updating balance and
 * ledger atomically in a transaction.
 */
import type { PrismaClient } from "@prisma/client"
import { WalletMigrationRepository, WalletSnapshot, MIGRATION_REASON } from "@/wallet"

export function createPrismaWalletMigrationRepository(db: PrismaClient): WalletMigrationRepository {
  return {
    listUnconvertedPage: async (cursor: string | null, limit: number) => {
      const rows = await db.wallet.findMany({
        where: { entries: { none: { reason: MIGRATION_REASON } } },
        take: limit,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: "asc" },
        select: { id: true, clientId: true, coinBalance: true },
      })
      const wallets: WalletSnapshot[] = rows.map((r) => ({
        id: r.id,
        clientId: r.clientId,
        coinBalance: r.coinBalance,
      }))
      const nextCursor = wallets.length === limit ? wallets[wallets.length - 1].id : null
      return { wallets, nextCursor }
    },
    convert: async (input: { walletId: string; newCoins: number; reason: string }) => {
      return await db.$transaction(async (tx) => {
        const existing = await tx.walletEntry.findFirst({
          where: { walletId: input.walletId, reason: input.reason },
        })
        if (existing !== null) {
          return false
        }
        const wallet = await tx.wallet.findUnique({ where: { id: input.walletId } })
        if (wallet === null) {
          return false
        }
        const delta = input.newCoins - wallet.coinBalance
        if (delta === 0) {
          return false
        }
        await tx.wallet.update({
          where: { id: input.walletId },
          data: { coinBalance: input.newCoins },
        })
        await tx.walletEntry.create({
          data: {
            walletId: input.walletId,
            amount: delta,
            reason: input.reason,
          },
        })
        return true
      })
    },
  }
}
