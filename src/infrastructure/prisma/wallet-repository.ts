/**
 * Prisma adapter for `WalletRepository`: creates wallets and applies credit,
 * debit, and entry writes atomically in transactions to preserve balance/ledger
 * consistency.
 */
import type { PrismaClient } from "@prisma/client"
import { WalletRepository, Wallet, WalletEntry } from "@/wallet"
import { assertPositiveCoins } from "@/wallet"

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002"
}

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
    credit: async (clientId: string, amount: number, reason: string, reference?: string) => {
      assertPositiveCoins(amount)
      try {
        const result = await db.$transaction(async (tx) => {
          await tx.wallet.upsert({
            where: { clientId },
            create: { clientId },
            update: {},
          })
          if (reference !== undefined) {
            const existing = await tx.walletEntry.findUnique({ where: { reference } })
            if (existing !== null) {
              const wallet = await tx.wallet.findUnique({ where: { clientId } })
              if (wallet === null) {
                throw new Error("wallet not found")
              }
              return wallet
            }
          }
          const updated = await tx.wallet.update({
            where: { clientId },
            data: { coinBalance: { increment: amount } },
          })
          await tx.walletEntry.create({
            data: {
              walletId: updated.id,
              amount,
              reason,
              reference,
            },
          })
          return updated
        })
        return { clientId: result.clientId, coinBalance: result.coinBalance }
      } catch (e) {
        if (reference !== undefined && isUniqueViolation(e)) {
          const wallet = await db.wallet.findUnique({ where: { clientId } })
          if (wallet !== null) {
            return { clientId: wallet.clientId, coinBalance: wallet.coinBalance }
          }
        }
        throw e
      }
    },
    debit: async (clientId: string, amount: number, reason: string, reference?: string) => {
      try {
        return await db.$transaction(async (tx) => {
          if (reference !== undefined) {
            const existing = await tx.walletEntry.findUnique({ where: { reference } })
            if (existing !== null) {
              return true
            }
          }
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
              reference,
            },
          })
          return true
        })
      } catch (e) {
        if (reference !== undefined && isUniqueViolation(e)) {
          return true
        }
        throw e
      }
    },
    findEntryByReference: async (reference: string) => {
      const entry = await db.walletEntry.findUnique({ where: { reference } })
      if (entry === null) {
        return null
      }
      return { id: entry.id, amount: entry.amount, reason: entry.reason, reference: entry.reference, createdAt: entry.createdAt.toISOString() }
    },
    reverseDebit: async (reference: string) => {
      try {
        await db.$transaction(async (tx) => {
          const entry = await tx.walletEntry.findUnique({ where: { reference } })
          if (entry === null || entry.amount >= 0) {
            return
          }
          await tx.wallet.update({ where: { id: entry.walletId }, data: { coinBalance: { increment: -entry.amount } } })
          await tx.walletEntry.delete({ where: { id: entry.id } })
        })
      } catch (e) {
        if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2025") {
          return
        }
        throw e
      }
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
      return row.entries.map((entry) => ({ id: entry.id, amount: entry.amount, reason: entry.reason, reference: entry.reference, createdAt: entry.createdAt.toISOString() }))
    },
  }
}
