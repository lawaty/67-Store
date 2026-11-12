/**
 * Prisma adapter for `PaymentRepository`: saves payments and resolves or
 * updates status by provider-scoped reference.
 */
import { PrismaClient } from "@prisma/client"
import { Payment } from "@/payments"
import { PaymentRepository } from "@/payments"
import { PaymentExpiryRepository } from "@/payments"
import { money } from "../../shared/money"
import { CurrencyCode } from "../../shared/money"

async function rowToPayment(row: any): Promise<Payment> {
  const { payment } = await import("@/payments")
  return payment({
    id: row.id,
    orderId: row.orderId,
    provider: row.provider as any,
    providerReference: row.providerReference,
    amount: money(row.amountMinor, row.currency as CurrencyCode),
    status: row.status as any,
  })
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002"
}

export function createPrismaPaymentRepository(db: PrismaClient): PaymentRepository & PaymentExpiryRepository {
  return {
    async save(p: Payment): Promise<void> {
      await db.payment.create({
        data: {
          id: p.id,
          orderId: p.orderId,
          provider: p.provider as any,
          providerReference: p.providerReference,
          amountMinor: p.amount.minor,
          currency: p.amount.currency,
          status: p.status as any,
        },
      })
    },

    async saveIfAbsent(p: Payment): Promise<boolean> {
      try {
        await db.payment.create({
          data: {
            id: p.id,
            orderId: p.orderId,
            provider: p.provider as any,
            providerReference: p.providerReference,
            amountMinor: p.amount.minor,
            currency: p.amount.currency,
            status: p.status as any,
          },
        })
        return true
      } catch (e) {
        if (isUniqueViolation(e)) {
          const existing = await db.payment.findUnique({ where: { providerReference: p.providerReference } })
          if (existing !== null && existing.orderId === p.orderId && existing.provider === p.provider) {
            return false
          }
        }
        throw e
      }
    },

    async findByProviderReference(provider, reference): Promise<Payment | null> {
      const row = await db.payment.findUnique({ where: { providerReference: reference } })
      if (row === null) {
        return null
      }
      if (row.provider !== provider) {
        return null
      }
      return rowToPayment(row)
    },

    async findByOrderId(orderId: string): Promise<Payment[]> {
      const rows = await db.payment.findMany({ where: { orderId } })
      const out: Payment[] = []
      for (const row of rows) {
        out.push(await rowToPayment(row))
      }
      return out
    },

    async markStatus(provider, reference, status): Promise<void> {
      const row = await db.payment.findUnique({ where: { providerReference: reference } })
      if (row === null) {
        return
      }
      if (row.provider !== provider) {
        return
      }
      await db.payment.update({ where: { providerReference: reference }, data: { status: status as any } })
    },

    async expirePendingOlderThan(cutoff: Date): Promise<number> {
      const result = await db.payment.updateMany({
        where: { status: "PENDING", createdAt: { lt: cutoff } },
        data: { status: "EXPIRED" },
      })
      return result.count
    },
  }
}
