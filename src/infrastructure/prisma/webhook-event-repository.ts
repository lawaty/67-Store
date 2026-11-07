/**
 * Prisma adapter for `WebhookEventRepository`: records provider webhook events
 * with idempotency enforced by the unique provider/eventId key, returning false
 * on duplicates.
 */
import { PrismaClient, Prisma } from "@prisma/client"
import { WebhookEventRepository } from "@/payments"

export function createPrismaWebhookEventRepository(db: PrismaClient): WebhookEventRepository {
  return {
    async record(provider: string, eventId: string, payload: unknown): Promise<boolean> {
      try {
        await db.webhookEvent.create({
          data: {
            provider,
            eventId,
            payload: payload as never,
          },
        })
        return true
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          return false
        }
        throw e
      }
    },
  }
}
