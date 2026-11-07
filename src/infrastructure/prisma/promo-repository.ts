/**
 * Prisma adapter for `PromoRepository`: manages promo codes and redeems them
 * in a transaction with optimistic use counting and idempotent redemption.
 */
import { Prisma, PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { PromoRepository, RedeemResult } from "@/promos"
import { PromoCode, isRedeemable, normalizeCode } from "@/promos"

function toPromoCode(row: {
  id: string
  code: string
  kind: "PERCENT" | "FIXED"
  basisPoints: number | null
  amountMinor: number | null
  maxUses: number | null
  uses: number
  active: boolean
  expiresAt: Date | null
}): PromoCode {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    basisPoints: row.basisPoints,
    amountMinor: row.amountMinor,
    maxUses: row.maxUses,
    uses: row.uses,
    active: row.active,
    expiresAt: row.expiresAt === null ? null : row.expiresAt.toISOString(),
  }
}

export function createPrismaPromoRepository(db: PrismaClient): PromoRepository {
  return {
    create: async (input) => {
      await db.promoCode.create({
        data: {
          id: input.id,
          code: normalizeCode(input.code),
          kind: input.kind,
          basisPoints: input.basisPoints,
          amountMinor: input.amountMinor,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt === null ? null : new Date(input.expiresAt),
        },
      })
    },
    listAll: async () => {
      const rows = await db.promoCode.findMany({ orderBy: { createdAt: "desc" } })
      return rows.map((row) => toPromoCode(row))
    },
    setActive: async (id: string, active: boolean) => {
      await db.promoCode.update({
        where: { id },
        data: { active },
      })
    },
    redeem: async (input: { code: string; orderId: string; clientId: string | null; now: string }): Promise<RedeemResult> => {
      const normalized = normalizeCode(input.code)
      const result = await db.$transaction(async (tx) => {
        const promoRow = await tx.promoCode.findFirst({
          where: { code: normalized },
        })
        if (promoRow === null) {
          return { ok: false as const, reason: "unknown" as const }
        }
        const promo = toPromoCode(promoRow)
        if (!promo.active) {
          return { ok: false as const, reason: "inactive" as const }
        }
        if (promo.expiresAt !== null && promo.expiresAt <= input.now) {
          return { ok: false as const, reason: "expired" as const }
        }
        if (promo.maxUses !== null && promo.uses >= promo.maxUses) {
          return { ok: false as const, reason: "exhausted" as const }
        }
        const updateResult = await tx.promoCode.updateMany({
          where: { id: promo.id, uses: promo.uses },
          data: { uses: { increment: 1 } },
        })
        if (updateResult.count === 0) {
          const reRead = await tx.promoCode.findUnique({ where: { id: promo.id } })
          if (reRead === null) {
            return { ok: false as const, reason: "unknown" as const }
          }
          const rePromo = toPromoCode(reRead)
          if (!isRedeemable(rePromo, input.now)) {
            if (!rePromo.active) return { ok: false as const, reason: "inactive" as const }
            if (rePromo.expiresAt !== null && rePromo.expiresAt <= input.now) return { ok: false as const, reason: "expired" as const }
            return { ok: false as const, reason: "exhausted" as const }
          }
          return { ok: false as const, reason: "exhausted" as const }
        }
        try {
          await tx.promoRedemption.create({
            data: {
              id: randomUUID(),
              promoCodeId: promo.id,
              orderId: input.orderId,
              clientId: input.clientId,
            },
          })
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            const current = await tx.promoCode.findUnique({ where: { id: promo.id } })
            if (current === null) {
              return { ok: false as const, reason: "unknown" as const }
            }
            return { ok: true as const, promo: toPromoCode(current) }
          }
          throw e
        }
        const updated = await tx.promoCode.findUnique({ where: { id: promo.id } })
        if (updated === null) {
          return { ok: false as const, reason: "unknown" as const }
        }
        return { ok: true as const, promo: toPromoCode(updated) }
      })
      return result
    },
  }
}
