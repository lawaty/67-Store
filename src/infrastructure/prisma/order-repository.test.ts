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
      profileId: "prof1",
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
      costUsdtMilli: null,
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
      client: { id: "c1", account: null as { id: string; username: string } | null },
      product: { id: "p1", distributorId: "d1", name: "86", costMinor: 10000, currency: "USD", game: "mlbb" },
      ...overrides,
    }
  }

  it("maps coinValueMinor and costUsdtMilli from DB row and preserves null for legacy rows", async () => {
    const findUnique = vi.fn().mockResolvedValue(fullRow({ coinValueMinor: 100, costUsdtMilli: BigInt(1367) }))
    const db = { order: { findUnique, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const found = await repo.findById("o1")
    expect(found?.coinValueMinor).toBe(100)
    expect(found?.costUsdtMilli).toBe(1367)

    findUnique.mockResolvedValue(fullRow({ coinValueMinor: null, costUsdtMilli: null }))
    const legacy = await repo.findById("o1")
    expect(legacy?.coinValueMinor).toBeNull()
    expect(legacy?.costUsdtMilli).toBeNull()
  })

  it("exposes clientAccount when the row has client.account", async () => {
    const findUnique = vi.fn().mockResolvedValue(
      fullRow({ client: { id: "c1", account: { id: "acc1", username: "alice", email: "alice@example.com" } } })
    )
    const db = { order: { findUnique, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const found = await repo.findById("o1")
    expect(found?.clientAccount).toEqual({ id: "acc1", username: "alice", email: "alice@example.com" })
  })

  it("persists consent fields on save/update and hydrates termsAcceptedAt to ISO string", async () => {
    const create = vi.fn().mockResolvedValue({})
    const update = vi.fn().mockResolvedValue({})
    const findUnique = vi.fn().mockResolvedValue(
      fullRow({ termsVersion: "v1", termsAcceptedAt: new Date("2026-01-02T03:04:05.000Z") })
    )
    const db = { order: { create, update, findUnique, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const o = order({
      id: "o1",
      token: "tok1",
      profileId: "prof1",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
      player: player("u1", "s1"),
      price: money(12000, "USD"),
      markupBasisPoints: 0,
      termsVersion: "v1",
      termsAcceptedAt: "2026-01-02T03:04:05.000Z",
    })
    await repo.save(o)
    expect(create.mock.calls[0][0].data.termsVersion).toBe("v1")
    expect(create.mock.calls[0][0].data.termsAcceptedAt).toEqual(new Date("2026-01-02T03:04:05.000Z"))
    await repo.update(o)
    expect(update.mock.calls[0][0].data.termsVersion).toBe("v1")
    expect(update.mock.calls[0][0].data.termsAcceptedAt).toEqual(new Date("2026-01-02T03:04:05.000Z"))

    const hydrated = await repo.findById("o1")
    expect(hydrated?.termsVersion).toBe("v1")
    expect(hydrated?.termsAcceptedAt).toBe("2026-01-02T03:04:05.000Z")
  })

  it("persists coinValueMinor and costUsdtMilli on save and update", async () => {
    const create = vi.fn().mockResolvedValue({})
    const update = vi.fn().mockResolvedValue({})
    const db = { order: { create, update, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const o = order({
      id: "o1",
      token: "tok1",
      profileId: "prof1",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
      player: player("u1", "s1"),
      price: money(12000, "USD"),
      coinValueMinor: 100,
      costUsdtMilli: 1367,
      markupBasisPoints: 0,
    })
    await repo.save(o)
    expect(create.mock.calls[0][0].data.coinValueMinor).toBe(100)
    expect(create.mock.calls[0][0].data.costUsdtMilli).toBe(BigInt(1367))
    await repo.update(o)
    expect(update.mock.calls[0][0].data.coinValueMinor).toBe(100)
    expect(update.mock.calls[0][0].data.costUsdtMilli).toBe(BigInt(1367))

    const legacy = order({
      id: "o2",
      token: "tok2",
      profileId: "prof1",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
      player: player("u1", "s1"),
      price: money(12000, "USD"),
      markupBasisPoints: 0,
    })
    await repo.save(legacy)
    expect(create.mock.calls[1][0].data.coinValueMinor).toBeNull()
    expect(create.mock.calls[1][0].data.costUsdtMilli).toBeNull()
  })

  it("round-trips costUsdtMilli as BigInt on save/update and number/null on read", async () => {
    const create = vi.fn().mockResolvedValue({})
    const update = vi.fn().mockResolvedValue({})
    const findUnique = vi.fn().mockResolvedValue(fullRow({ costUsdtMilli: BigInt(1367) }))
    const db = { order: { create, update, findUnique, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)

    const o = order({
      id: "o1",
      token: "tok1",
      profileId: "prof1",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
      player: player("u1", "s1"),
      price: money(12000, "USD"),
      markupBasisPoints: 0,
      costUsdtMilli: 1367,
    })
    await repo.save(o)
    expect(create.mock.calls[0][0].data.costUsdtMilli).toEqual(BigInt(1367))
    await repo.update(o)
    expect(update.mock.calls[0][0].data.costUsdtMilli).toEqual(BigInt(1367))

    const oNull = order({
      id: "o2",
      token: "tok2",
      profileId: "prof1",
      client: client("c1"),
      product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
      player: player("u1", "s1"),
      price: money(12000, "USD"),
      markupBasisPoints: 0,
      costUsdtMilli: null,
    })
    await repo.save(oNull)
    expect(create.mock.calls[1][0].data.costUsdtMilli).toBeNull()
    await repo.update(oNull)
    expect(update.mock.calls[1][0].data.costUsdtMilli).toBeNull()

    const found = await repo.findById("o1")
    expect(found?.costUsdtMilli).toBe(1367)
    findUnique.mockResolvedValue(fullRow({ costUsdtMilli: null }))
    const foundNull = await repo.findById("o1")
    expect(foundNull?.costUsdtMilli).toBeNull()
  })
})


describe("createPrismaOrderRepository markupBasisPoints", () => {
  function row(overrides: Record<string, unknown> = {}) {
    return {
      id: "o1",
      token: "tok1",
      profileId: "prof1",
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
      costUsdtMilli: null,
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
      client: { id: "c1", account: null as { id: string; username: string; email: string } | null },
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

  it("persists consent fields and hydrates termsAcceptedAt to ISO string", async () => {
    const create = vi.fn().mockResolvedValue({})
    const findUnique = vi.fn().mockResolvedValue(
      row({ termsVersion: "v1", termsAcceptedAt: new Date("2026-01-02T03:04:05.000Z") })
    )
    const db = { order: { create, findUnique, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)
    const o = (await createPrismaOrderRepository({
      order: { findUnique: vi.fn().mockResolvedValue(row({ termsVersion: "v1", termsAcceptedAt: new Date("2026-01-02T03:04:05.000Z") })), aggregate: vi.fn() },
    } as unknown as PrismaClient).findById("o1"))!
    await repo.save(o)
    expect(create.mock.calls[0][0].data.termsVersion).toBe("v1")
    expect(create.mock.calls[0][0].data.termsAcceptedAt).toEqual(new Date("2026-01-02T03:04:05.000Z"))
    const hydrated = await repo.findById("o1")
    expect(hydrated?.termsVersion).toBe("v1")
    expect(hydrated?.termsAcceptedAt).toBe("2026-01-02T03:04:05.000Z")
  })
})

describe("createPrismaOrderRepository.summarizeByClient", () => {
  it("returns counts and coin sums for the client and monthStart", async () => {
    const count = vi.fn().mockResolvedValue(5)
    const aggregate = vi.fn()
      .mockResolvedValueOnce({ _sum: { coinsCharged: 500 } })
      .mockResolvedValueOnce({ _sum: { coinsCharged: 120 } })
    const db = { order: { count, aggregate } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)

    const result = await repo.summarizeByClient("c1", "2026-11-01T00:00:00.000Z")

    expect(result).toEqual({ totalOrders: 5, totalPaidCoins: 500, monthlyPaidCoins: 120 })
    expect(count).toHaveBeenCalledWith({ where: { clientId: "c1" } })
    expect(aggregate).toHaveBeenNthCalledWith(1, {
      _sum: { coinsCharged: true },
      where: { clientId: "c1", status: { in: ["PAID", "FULFILLING", "DELIVERED"] } },
    })
    expect(aggregate).toHaveBeenNthCalledWith(2, {
      _sum: { coinsCharged: true },
      where: {
        clientId: "c1",
        status: { in: ["PAID", "FULFILLING", "DELIVERED"] },
        createdAt: { gte: new Date("2026-11-01T00:00:00.000Z") },
      },
    })
  })
})

describe("createPrismaOrderRepository.listFailedUnrefundedCoinOrders", () => {
  it("queries FAILED unrefunded orders with charged coins ordered oldest first", async () => {
    const dbRow = {
      id: "o1",
      token: "tok1",
      profileId: "prof1",
      clientId: "c1",
      productId: "p1",
      userId: "u1",
      serverId: "s1",
      priceMinor: 12000,
      currency: "USD",
      status: "FAILED",
      paymentReference: null,
      distributorOrderId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      discountMinor: 0,
      costMinor: 10000,
      costUsdtMilli: null,
      promoCodeId: null,
      playerName: null,
      wacEgpMinor: null,
      cogsEgpMinor: null,
      tradingMarginMinor: null,
      coinsCharged: 86,
      coinValueMinor: 100,
      coinsConsumed: 86,
      refundedAt: null,
      markupBasisPoints: 0,
      client: { id: "c1", account: null },
      product: { id: "p1", distributorId: "d1", name: "86", costMinor: 10000, currency: "USD", game: "mlbb" },
    }
    const findMany = vi.fn().mockResolvedValue([dbRow])
    const db = { order: { findMany, aggregate: vi.fn() } } as unknown as PrismaClient
    const repo = createPrismaOrderRepository(db)

    const result = await repo.listFailedUnrefundedCoinOrders(25)

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: "FAILED",
        refundedAt: null,
        coinsCharged: { not: null, gt: 0 },
      },
      orderBy: { createdAt: "asc" },
      take: 25,
      include: { client: true, product: true },
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("o1")
    expect(result[0].coinsCharged).toBe(86)
  })
})
