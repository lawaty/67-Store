/**
 * Prisma adapter for `CoinSupplyRepository`: aggregates the total coin supply
 * by summing wallet balances in one query.
 */
import type { PrismaClient } from "@prisma/client"
import { CoinSupplyRepository } from "@/wallet"

export function createPrismaCoinSupplyRepository(db: PrismaClient): CoinSupplyRepository {
  return {
    totalCoins: async () => {
      const agg = await db.wallet.aggregate({ _sum: { coinBalance: true } })
      return agg._sum.coinBalance ?? 0
    },
  }
}
