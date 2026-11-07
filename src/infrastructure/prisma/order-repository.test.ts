import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaOrderRepository } from "./order-repository"
import { order } from "@/ordering"
import { client } from "@/accounts"
import { product } from "@/catalogue"
import { player } from "@/ordering"
import { money } from "../../shared/money"

function fakeDb(aggregateResult: { _sum: { coinsCharged: number | null } }) {
  return {
    order: {
      aggregate: vi.fn().mockResolvedValue(aggregateResult),
    },
  } as unknown as PrismaClient
}

describe("createPrismaOrderRepository.sumCoinsChargedSince", () => {
  it("sums coinsCharged for DELIVERED orders created at or after since", async () => {
    const db = {
      order: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { coinsCharged: 420 } }),
      },
    } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const result = await repo.sumCoinsChargedSince("2026-02-01T00:00:00.000Z")
    expect(result).toBe(420)
    expect((db as any).order.aggregate).toHaveBeenCalledWith({
      _sum: { coinsCharged: true },
      where: { status: "DELIVERED", createdAt: { gte: new Date("2026-02-01T00:00:00.000Z") } },
    })
  })

  it("returns 0 when aggregate sum is null (e.g. null coinsCharged contributes 0)", async () => {
    const repo = createPrismaOrderRepository(fakeDb({ _sum: { coinsCharged: null } }))
    await expect(repo.sumCoinsChargedSince("2026-02-01T00:00:00.000Z")).resolves.toBe(0)
  })

  it("returns 0 when aggregate sum is undefined", async () => {
    const repo = createPrismaOrderRepository(
      fakeDb({ _sum: { coinsCharged: undefined as unknown as number | null } })
    )
    await expect(repo.sumCoinsChargedSince("2026-02-01T00:00:00.000Z")).resolves.toBe(0)
  })

  it("throws for negative sum", async () => {
    const repo = createPrismaOrderRepository(fakeDb({ _sum: { coinsCharged: -5 } }))
    await expect(repo.sumCoinsChargedSince("2026-02-01T00:00:00.000Z")).rejects.toBeInstanceOf(RangeError)
  })

  it("throws for malformed sum", async () => {
    const repo = createPrismaOrderRepository(
      fakeDb({ _sum: { coinsCharged: 2.5 as unknown as number } })
    )
    await expect(repo.sumCoinsChargedSince("2026-02-01T00:00:00.000Z")).rejects.toBeInstanceOf(RangeError)
  })

  function fullRow(overrides: Record<string, unknown> = {}) {
    return {
      id: "o1",
      token: "tok1",
      clientId: "c1",
      productId: "p1",
      userId: "u1",
      serverId: "s1",
      priceMinor: 12000,
      currency: "USD",
      status: "CREATED",
      paymentReference: null,
      distributorOrderId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      discountMinor: 0,
      costMinor: 10000,
      promoCodeId: null,
      playerName: null,
      wacEgpMinor: null,
      cogsEgpMinor: null,
      tradingMarginMinor: null,
      coinsCharged: null,
      coinValueMinor: null,
      coinsConsumed: null,
      refundedAt: null,
      markupBasisPoints: 0,
      client: { id: "c1" },
      product: { id: "p1", distributorId: "d1", name: "86", costMinor: 10000, currency: "USD", game: "mlbb" },
      ...overrides,
    }
  }

  it("maps coinValueMinor from DB row and preserves null for legacy rows", async () => {
    const findUnique = vi.fn().mockResolvedValue(fullRow({ coinValueMinor: 100 }))
    const db = { order: { findUnique, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    expect((await repo.findById("o1"))?.coinValueMinor).toBe(100)

    findUnique.mockResolvedValue(fullRow({ coinValueMinor: null }))
    expect((await repo.findById("o1"))?.coinValueMinor).toBeNull()
  })

  it("persists coinValueMinor on save and update", async () => {
    const create = vi.fn().mockResolvedValue({})
    const update = vi.fn().mockResolvedValue({})
    const db = { order: { create, update, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const o = order({
      id: "o1",
      token: "tok1",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
      player: player("u1", "s1"),
      price: money(12000, "USD"),
      coinValueMinor: 100,
      markupBasisPoints: 0,
    })
    await repo.save(o)
    expect(create.mock.calls[0][0].data.coinValueMinor).toBe(100)
    await repo.update(o)
    expect(update.mock.calls[0][0].data.coinValueMinor).toBe(100)

    const legacy = order({
      id: "o2",
      token: "tok2",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
      player: player("u1", "s1"),
      price: money(12000, "USD"),
      markupBasisPoints: 0,
    })
    await repo.save(legacy)
    expect(create.mock.calls[1][0].data.coinValueMinor).toBeNull()
  })
})


describe("createPrismaOrderRepository markupBasisPoints", () => {
  function row(overrides: Record<string, unknown> = {}) {
    return {
      id: "o1",
      token: "tok1",
      clientId: "c1",
      productId: "p1",
      userId: "u1",
      serverId: "s1",
      priceMinor: 12000,
      currency: "USD",
      status: "CREATED",
      paymentReference: null,
      distributorOrderId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      discountMinor: 0,
      costMinor: 10000,
      promoCodeId: null,
      playerName: null,
      wacEgpMinor: null,
      cogsEgpMinor: null,
      tradingMarginMinor: null,
      coinsCharged: null,
      coinValueMinor: null,
      coinsConsumed: null,
      refundedAt: null,
      markupBasisPoints: 1500,
      client: { id: "c1" },
      product: { id: "p1", distributorId: "d1", name: "86", costMinor: 10000, currency: "USD", game: "mlbb" },
      ...overrides,
    }
  }

  it("maps markupBasisPoints from DB row and preserves null for legacy rows", async () => {
    const findUnique = vi.fn().mockResolvedValue(row({ markupBasisPoints: 1500 }))
    const db = { order: { findUnique, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const o = await repo.findById("o1")
    expect(o?.markupBasisPoints).toBe(1500)

    findUnique.mockResolvedValue(row({ markupBasisPoints: null }))
    const legacy = await repo.findById("o1")
    expect(legacy?.markupBasisPoints).toBeNull()
  })

  it("persists markupBasisPoints on save and update", async () => {
    const create = vi.fn().mockResolvedValue({})
    const update = vi.fn().mockResolvedValue({})
    const db = { order: { create, update, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const o = (await createPrismaOrderRepository({
      order: { findUnique: vi.fn().mockResolvedValue(row({ markupBasisPoints: 1234 })), aggregate: vi.fn() },
    } as unknown as PrismaClient).findById("o1"))!
    await repo.save(o)
    expect(create.mock.calls[0][0].data.markupBasisPoints).toBe(1234)
    await repo.update(o)
    expect(update.mock.calls[0][0].data.markupBasisPoints).toBe(1234)

    const legacy = (await createPrismaOrderRepository({
      order: { findUnique: vi.fn().mockResolvedValue(row({ markupBasisPoints: null })), aggregate: vi.fn() },
    } as unknown as PrismaClient).findById("o1"))!
    await repo.save(legacy)
    expect(create.mock.calls[1][0].data.markupBasisPoints).toBeNull()
  })
})
