/**
 * Prisma adapter for `WalletFundingRepository`: stores wallet fundings,
 * atomically transitions PENDING fundings to PAID, and attaches deposits.
 */
import type { PrismaClient } from "@prisma/client"
import { walletFunding, type WalletFunding, type WalletFundingRepository } from "@/treasury"

function toDomain(row: {
  id: string
  clientId: string
  currency: string
  amountMinor: number
  rateMinor: number
  coins: number
  wacEgpMinor: number
  egpValueMinor: number
  provider: string
  providerReference: string
  status: string
  depositId: string | null
  createdAt: Date
  paidAt: Date | null
}): WalletFunding {
  return walletFunding({
    id: row.id,
    clientId: row.clientId,
    currency: row.currency,
    amountMinor: row.amountMinor,
    rateMinor: row.rateMinor,
    coins: row.coins,
    wacEgpMinor: row.wacEgpMinor,
    egpValueMinor: row.egpValueMinor,
    provider: row.provider as any,
    providerReference: row.providerReference,
    status: row.status as any,
    depositId: row.depositId,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  })
}

export function createPrismaWalletFundingRepository(db: PrismaClient): WalletFundingRepository {
  return {
    create: async (funding) => {
      await db.walletFunding.create({
        data: {
          id: funding.id,
          clientId: funding.clientId,
          currency: funding.currency,
          amountMinor: funding.amountMinor,
          rateMinor: funding.rateMinor,
          coins: funding.coins,
          wacEgpMinor: funding.wacEgpMinor,
          egpValueMinor: funding.egpValueMinor,
          provider: funding.provider,
          providerReference: funding.providerReference,
          status: funding.status,
          depositId: funding.depositId,
          createdAt: new Date(funding.createdAt),
          paidAt: funding.paidAt ? new Date(funding.paidAt) : null,
        },
      })
    },
    findByReference: async (providerReference: string) => {
      const row = await db.walletFunding.findUnique({ where: { providerReference } })
      if (row === null) {
        return null
      }
      return toDomain(row as any)
    },
    markPaid: async (id: string, paidAt: string) => {
      const result = await db.walletFunding.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "PAID", paidAt: new Date(paidAt) },
      })
      return result.count === 1
    },
    attachDeposit: async (id: string, depositId: string) => {
      await db.walletFunding.update({
        where: { id },
        data: { depositId },
      })
    },
  }
}
