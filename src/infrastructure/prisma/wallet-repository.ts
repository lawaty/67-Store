/**
 * Prisma adapter for `WalletRepository`: creates wallets and applies credit,
 * debit, and entry writes atomically in transactions to preserve balance/ledger
 * consistency.
 */
import type { PrismaClient } from "@prisma/client"
import { WalletRepository, Wallet, WalletEntry } from "@/wallet"
import { assertPositiveCoins } from "@/wallet"

export function createPrismaWalletRepository(db: PrismaClient): WalletRepository {
  return {
    getOrCreate: async (clientId: string) => {
      const row = await db.wallet.upsert({
        where: { clientId },
        create: { clientId },
        update: {},
      })
      return { clientId: row.clientId, coinBalance: row.coinBalance }
    },
    credit: async (clientId: string, amount: number, reason: string) => {
      assertPositiveCoins(amount)
      const result = await db.$transaction(async (tx) => {
        await tx.wallet.upsert({
          where: { clientId },
          create: { clientId },
          update: {},
        })
        const updated = await tx.wallet.update({
          where: { clientId },
          data: { coinBalance: { increment: amount } },
        })
        await tx.walletEntry.create({
          data: {
            walletId: updated.id,
            amount,
            reason,
          },
        })
        return updated
      })
      return { clientId: result.clientId, coinBalance: result.coinBalance }
    },
    debit: async (clientId: string, amount: number, reason: string) => {
      return await db.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { clientId },
        })
        if (wallet === null || wallet.coinBalance < amount) {
          return false
        }
        const updated = await tx.wallet.update({
          where: { clientId },
          data: { coinBalance: { decrement: amount } },
        })
        await tx.walletEntry.create({
          data: {
            walletId: updated.id,
            amount: -amount,
            reason,
          },
        })
        return true
      })
    },
    listEntries: async (clientId: string, limit: number) => {
      const row = await db.wallet.findFirst({
        where: { clientId },
        include: {
          entries: {
            orderBy: { createdAt: "desc" },
            take: limit,
          },
        },
      })
      if (row === null) {
        return []
      }
      return row.entries.map((entry) => ({ id: entry.id, amount: entry.amount, reason: entry.reason, createdAt: entry.createdAt.toISOString() }))
    },
  }
}
