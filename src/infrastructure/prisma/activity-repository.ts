/**
 * Prisma adapter for `ActivityRepository`: sums qualifying client volume
 * since a cutoff as coin deposits plus delivered orders not paid with coins.
 */
import type { PrismaClient } from "@prisma/client"
import type { ActivityRepository } from "@/ordering"

export function createPrismaActivityRepository(db: PrismaClient): ActivityRepository {
  return {
    sumQualifiedVolumeSince: async (clientId: string, since: Date) => {
      const [deposits, orders] = await Promise.all([
        db.deposit.aggregate({
          _sum: { coins: true },
          where: { clientId, createdAt: { gte: since } },
        }),
        db.order.aggregate({
          _sum: { coinsConsumed: true },
          where: {
            clientId,
            status: "DELIVERED",
            createdAt: { gte: since },
            OR: [{ coinsCharged: null }, { coinsCharged: 0 }],
          },
        }),
      ])
      const depositSum = deposits._sum.coins ?? 0
      const orderSum = orders._sum.coinsConsumed ?? 0
      const total = depositSum + orderSum
      if (!Number.isSafeInteger(total) || total < 0) {
        throw new RangeError("qualified volume must be a non-negative safe integer")
      }
      return total
    },
  }
}
