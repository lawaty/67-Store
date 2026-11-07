/**
 * Prisma adapter for `PaymentRepository`: saves payments and resolves or
 * updates status by provider-scoped reference.
 */
import { PrismaClient } from "@prisma/client"
import { Payment } from "@/payments"
import { PaymentRepository } from "@/payments"
import { money } from "../../shared/money"
import { CurrencyCode } from "../../shared/money"

export function createPrismaPaymentRepository(db: PrismaClient): PaymentRepository {
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

    async findByProviderReference(provider, reference): Promise<Payment | null> {
      const row = await db.payment.findUnique({ where: { providerReference: reference } })
      if (row === null) {
        return null
      }
      if (row.provider !== provider) {
        return null
      }
      const { payment } = await import("@/payments")
      return payment({
        id: row.id,
        orderId: row.orderId,
        provider: row.provider as any,
        providerReference: row.providerReference,
        amount: money(row.amountMinor, row.currency as CurrencyCode),
        status: row.status as any,
      })
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
  }
}
