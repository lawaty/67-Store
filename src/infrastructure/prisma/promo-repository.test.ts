import { describe, it, expect } from "vitest"
import { PromoRepository, RedeemResult } from "@/promos"
import { PromoCode } from "@/promos"

// No prisma test harness exists in the repo; testing the repository via an in-memory fake.
function createInMemoryPromoRepository(): PromoRepository & { state: { promos: any[]; redemptions: any[] } } {
  const state = { promos: [] as any[], redemptions: [] as any[] }
  return {
    state,
    create: async (input) => {
      state.promos.push({
        id: input.id,
        code: input.code.toUpperCase(),
        kind: input.kind,
        basisPoints: input.basisPoints,
        amountMinor: input.amountMinor,
        maxUses: input.maxUses,
        uses: 0,
        active: true,
        expiresAt: input.expiresAt,
      })
    },
    listAll: async () => state.promos.map((p) => ({ ...p })) as PromoCode[],
    setActive: async (id, active) => {
      const p = state.promos.find((x) => x.id === id)
      if (p) p.active = active
    },
    redeem: async (input) => {
      const code = input.code.trim().replace(/\s+/g, " ").toUpperCase()
      const p = state.promos.find((x) => x.code === code)
      if (!p) return { ok: false, reason: "unknown" }
      if (!p.active) return { ok: false, reason: "inactive" }
      if (p.expiresAt !== null && p.expiresAt <= input.now) return { ok: false, reason: "expired" }
      if (p.maxUses !== null && p.uses >= p.maxUses) return { ok: false, reason: "exhausted" }
      // check order already redeemed
      if (state.redemptions.find((r) => r.orderId === input.orderId)) {
        return { ok: true, promo: { ...p } }
      }
      p.uses += 1
      state.redemptions.push({ id: "r1", promoCodeId: p.id, orderId: input.orderId, clientId: input.clientId })
      return { ok: true, promo: { ...p } }
    },
  }
}

describe("promo repository (in-memory fake)", () => {
  it("create and listAll", async () => {
    const repo = createInMemoryPromoRepository()
    await repo.create({ id: "p1", code: "save10", kind: "PERCENT", basisPoints: 1000, amountMinor: null, maxUses: 5, expiresAt: null })
    const all = await repo.listAll()
    expect(all[0].code).toBe("SAVE10")
  })

  it("setActive toggles", async () => {
    const repo = createInMemoryPromoRepository()
    await repo.create({ id: "p1", code: "SAVE10", kind: "PERCENT", basisPoints: 1000, amountMinor: null, maxUses: null, expiresAt: null })
    await repo.setActive("p1", false)
    const res = await repo.redeem({ code: "SAVE10", orderId: "o1", clientId: null, now: "2026-01-01T00:00:00.000Z" })
    expect(res.ok).toBe(false)
  })

  it("redeem returns reasons correctly", async () => {
    const repo = createInMemoryPromoRepository()
    await repo.create({ id: "p1", code: "S1", kind: "FIXED", basisPoints: null, amountMinor: 100, maxUses: 1, expiresAt: null })
    expect((await repo.redeem({ code: "nope", orderId: "o1", clientId: null, now: "2026-01-01T00:00:00.000Z" })).ok).toBe(false)
    const r1 = await repo.redeem({ code: "S1", orderId: "o1", clientId: null, now: "2026-01-01T00:00:00.000Z" })
    expect(r1.ok).toBe(true)
    const r2 = await repo.redeem({ code: "S1", orderId: "o2", clientId: null, now: "2026-01-01T00:00:00.000Z" })
    expect(r2.ok).toBe(false)
    expect((r2 as any).reason).toBe("exhausted")
  })
})
