import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { client } from "@/accounts"
import { product } from '@/catalogue'
import { order } from "@/ordering"
import { player } from "@/ordering"
import { money } from "@/shared/money"
import { presentOrder, readOrder, resumeOrderPayment } from "./orders"

const sample = order({
  id: "o1",
  token: "tok_abc",
  profileId: "p1",
  client: client("c1"),
  product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(800, "USD"), game: "mlbb" }),
  player: player("1", "2"),
  price: money(1000, "USD"),
  status: "PAID",
  promoCodeId: "promo1",
  discountMinor: 500,
  playerName: "Player One",
  markupBasisPoints: 0,
})

function fakeContainer(found: typeof sample | null): Container {
  return {
    orders: {
      findByToken: async () => found,
      save: async () => {},
      findById: async () => found,
      update: async () => {},
      listRecent: async () => [],
      listByClient: async () => [],
      findByDistributorOrderId: async () => null,
      listByStatus: async () => [],
      search: async () => ({ rows: [], total: 0 }),
    },
    payments: {
      save: async () => {},
      saveIfAbsent: vi.fn(async () => true),
      findByProviderReference: async () => null,
      findByOrderId: async () => [],
      markStatus: async () => {},
    },
    paymentProviderAvailable: async () => true,
    startPayment: async (args: { order: any; provider: string; returnUrl: string }) => ({
      payment: null,
      redirectUrl: "/checkout/fake/ref",
    }),
    wallets: {
      debit: async () => true,
      credit: async () => ({ clientId: "c1", coinBalance: 0 }),
      getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
      listEntries: async () => [],
      findEntryByReference: async () => null,
      reverseDebit: vi.fn(async () => {}),
    },
    fulfilOrder: async (value: any) => value,
    promos: {
      listAll: async () => [
        {
          id: "promo1",
          code: "SAVE",
          kind: "PERCENT" as const,
          basisPoints: 1000,
          amountMinor: null,
          maxUses: null,
          uses: 0,
          active: true,
          expiresAt: null,
        },
      ],
      create: async () => {},
      setActive: async () => {},
      redeem: async () => ({ ok: false as const, reason: "unknown" as const }),
    },
    settings: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      all: async () => ({}),
    },
  } as unknown as Container
}

describe("readOrder", () => {
  it("returns the order DTO with resolved promo code and EGP amounts", async () => {
    const dto = await readOrder(fakeContainer(sample), "t1")

    expect(dto).not.toBeNull()
    expect(dto?.status).toBe("PAID")
    expect(dto?.productName).toBe("86")
    expect(dto?.promoCode).toBe("SAVE")
    expect(dto?.player).toEqual({ userId: "1", serverId: "2" })
    expect(dto?.price).toEqual(money(1000, "USD"))
    expect(dto?.egp).toEqual(money(48500, "EGP"))
    expect(dto?.discountEgp).toEqual(money(24250, "EGP"))
    expect(dto?.playerName).toBe("Player One")
  })

  it("returns null for an unknown token", async () => {
    expect(await readOrder(fakeContainer(null), "missing")).toBeNull()
  })
})

describe("presentOrder", () => {
  it("omits the discount when there is none", () => {
    const dto = presentOrder(sample, 48.5, null)
    expect(dto.discountEgp).toEqual(money(24250, "EGP"))

    const undiscounted = presentOrder(
      order({
        id: "o2",
        token: "t2",
        profileId: "p1",
        client: client("c1"),
        product: sample.product,
        player: sample.player,
        price: money(1000, "USD"),
        status: "CREATED",
        markupBasisPoints: 0,
      }),
      48.5,
      null,
    )

    expect(undiscounted.discountEgp).toBeNull()
  })
})

const awaiting = order({
  id: "o1",
  token: "tok_abc",
  profileId: "p1",
  client: client("c1"),
  product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(800, "USD"), game: "mlbb" }),
  player: player("1", "2"),
  price: money(1000, "USD"),
  status: "AWAITING_PAYMENT",
  promoCodeId: null,
  discountMinor: null,
  playerName: "Player One",
  markupBasisPoints: 0,
})

describe("resumeOrderPayment", () => {
  it("unknown token -> not_found", async () => {
    const res = await resumeOrderPayment(fakeContainer(null), "missing", "egp", { session: null, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: false, error: "not_found" })
  })

  it("not awaiting -> not_awaiting", async () => {
    const res = await resumeOrderPayment(fakeContainer(sample), "t1", "egp", { session: null, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: false, error: "not_awaiting" })
  })

  it("egp provider available -> startPayment PAYMOB", async () => {
    const startPayment = vi.fn(async (args: any) => ({ payment: null, redirectUrl: "/redir" }))
    const container = fakeContainer(awaiting)
    ;(container as any).startPayment = startPayment
    const res = await resumeOrderPayment(container, "tok_abc", "egp", { session: null, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: true, redirectUrl: "/redir" })
    expect(startPayment).toHaveBeenCalledWith(expect.objectContaining({ provider: "PAYMOB" }))
  })

  it("provider unavailable -> unavailable, startPayment not called", async () => {
    const startPayment = vi.fn(async (args: any) => ({ payment: null, redirectUrl: "/redir" }))
    const container = fakeContainer(awaiting)
    ;(container as any).paymentProviderAvailable = async () => false
    ;(container as any).startPayment = startPayment
    const res = await resumeOrderPayment(container, "tok_abc", "egp", { session: null, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: false, error: "unavailable" })
    expect(startPayment).not.toHaveBeenCalled()
  })

  it("PAID payment exists while awaiting -> updated to PAID, no charge", async () => {
    const update = vi.fn(async () => {})
    const container = fakeContainer(awaiting)
    ;(container as any).payments.findByOrderId = async () => [{ id: "p", orderId: "o1", provider: "PAYMOB", providerReference: "ref_paid", amount: money(1000, "USD"), status: "PAID" }]
    ;(container as any).orders.update = update
    const res = await resumeOrderPayment(container, "tok_abc", "egp", { session: null, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: true, redirectUrl: "/order/tok_abc" })
    expect(update).toHaveBeenCalled()
  })

  it("PAID COINS payment exists while awaiting -> recovered with ledger coins, no debit", async () => {
    const update = vi.fn(async (_order: any) => {})
    const debit = vi.fn(async () => true)
    const findEntryByReference = vi.fn(async () => ({
      id: "e1",
      amount: -50,
      reason: "order:o1",
      reference: "coins:o1",
      createdAt: "2026-01-01T00:00:00.000Z",
    }))
    const container = fakeContainer(awaiting)
    ;(container as any).payments.findByOrderId = async () => [{ id: "p", orderId: "o1", provider: "COINS", providerReference: "coins:o1", amount: money(1000, "USD"), status: "PAID" }]
    ;(container as any).wallets.findEntryByReference = findEntryByReference
    ;(container as any).wallets.debit = debit
    ;(container as any).orders.update = update
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: { accountId: "a1", clientId: "c1" }, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: true, redirectUrl: "/order/tok_abc" })
    expect(findEntryByReference).toHaveBeenCalledWith("coins:o1")
    expect(debit).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalled()
    const updated = update.mock.calls[0]![0] as any
    expect(updated.status).toBe("PAID")
    expect(updated.coinsCharged).toBe(50)
    expect(updated.coinsConsumed).toBe(50)
  })

  it("coins no session -> login, wallet not debited", async () => {
    const debit = vi.fn(async () => true)
    const container = fakeContainer(awaiting)
    ;(container as any).wallets.debit = debit
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: null, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: false, error: "login" })
    expect(debit).not.toHaveBeenCalled()
  })

  it("coins session mismatch -> login", async () => {
    const debit = vi.fn(async () => true)
    const container = fakeContainer(awaiting)
    ;(container as any).wallets.debit = debit
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: { accountId: "a2", clientId: "c2" }, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: false, error: "login" })
    expect(debit).not.toHaveBeenCalled()
  })

  it("coins matching session -> debited, paid payment, updated", async () => {
    const debit = vi.fn(async () => true)
    const saveIfAbsent = vi.fn(async () => true)
    const update = vi.fn(async (_order: any) => {})
    const findEntryByReference = vi.fn(async () => ({
      id: "e1",
      amount: -50,
      reason: "order:o1",
      reference: "coins:o1",
      createdAt: "2026-01-01T00:00:00.000Z",
    }))
    const container = fakeContainer(awaiting)
    ;(container as any).wallets.debit = debit
    ;(container as any).wallets.findEntryByReference = findEntryByReference
    ;(container as any).payments.saveIfAbsent = saveIfAbsent
    ;(container as any).orders.update = update
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: { accountId: "a1", clientId: "c1" }, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: true, redirectUrl: "/order/tok_abc" })
    expect(debit).toHaveBeenCalledWith("c1", expect.any(Number), "order:o1", "coins:o1")
    expect(saveIfAbsent).toHaveBeenCalledWith(expect.objectContaining({ providerReference: "coins:o1", provider: "COINS" }))
    expect(update).toHaveBeenCalled()
    const updated = update.mock.calls[0]![0] as any
    expect(updated.coinsCharged).toBe(50)
    expect(updated.coinsConsumed).toBe(50)
  })

  it("debit returns false -> coins error, saveIfAbsent and orders.update not called", async () => {
    const debit = vi.fn(async () => false)
    const saveIfAbsent = vi.fn(async () => true)
    const update = vi.fn(async () => {})
    const container = fakeContainer(awaiting)
    ;(container as any).wallets.debit = debit
    ;(container as any).payments.saveIfAbsent = saveIfAbsent
    ;(container as any).orders.update = update
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: { accountId: "a1", clientId: "c1" }, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: false, error: "coins" })
    expect(saveIfAbsent).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it("saveIfAbsent rejects -> reverseDebit called and coins error, orders.update not called", async () => {
    const debit = vi.fn(async () => true)
    const saveIfAbsent = vi.fn(async () => { throw new Error("boom") })
    const reverseDebit = vi.fn(async () => {})
    const update = vi.fn(async () => {})
    const container = fakeContainer(awaiting)
    ;(container as any).wallets.debit = debit
    ;(container as any).payments.saveIfAbsent = saveIfAbsent
    ;(container as any).wallets.reverseDebit = reverseDebit
    ;(container as any).orders.update = update
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: { accountId: "a1", clientId: "c1" }, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: false, error: "coins" })
    expect(reverseDebit).toHaveBeenCalledWith("coins:o1")
    expect(update).not.toHaveBeenCalled()
  })

  it("saveIfAbsent resolves false while awaiting -> ok, recovery update, fulfilOrder not called", async () => {
    const debit = vi.fn(async () => true)
    const saveIfAbsent = vi.fn(async () => false)
    const update = vi.fn(async () => {})
    const fulfilOrder = vi.fn(async (value: any) => value)
    const findByToken = vi.fn(async () => awaiting)
    const container = fakeContainer(awaiting)
    ;(container as any).wallets.debit = debit
    ;(container as any).payments.saveIfAbsent = saveIfAbsent
    ;(container as any).orders.update = update
    ;(container as any).orders.findByToken = findByToken
    ;(container as any).fulfilOrder = fulfilOrder
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: { accountId: "a1", clientId: "c1" }, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: true, redirectUrl: "/order/tok_abc" })
    expect(update).toHaveBeenCalled()
    expect(fulfilOrder).not.toHaveBeenCalled()
  })

  it("saveIfAbsent resolves false while fulfilling/delivered -> ok, no update, no fulfil", async () => {
    const debit = vi.fn(async () => true)
    const saveIfAbsent = vi.fn(async () => false)
    const update = vi.fn(async () => {})
    const fulfilOrder = vi.fn(async (value: any) => value)
    const fulfilling = order({ ...awaiting, status: "FULFILLING" } as any)
    const container = fakeContainer(awaiting)
    ;(container as any).wallets.debit = debit
    ;(container as any).payments.saveIfAbsent = saveIfAbsent
    ;(container as any).orders.update = update
    ;(container as any).orders.findByToken = vi.fn()
      .mockResolvedValueOnce(awaiting)
      .mockResolvedValueOnce(fulfilling)
    ;(container as any).fulfilOrder = fulfilOrder
    const res = await resumeOrderPayment(container, "tok_abc", "coins", { session: { accountId: "a1", clientId: "c1" }, allowFakeFulfilment: false, newId: () => "id" })
    expect(res).toEqual({ ok: true, redirectUrl: "/order/tok_abc" })
    expect(update).not.toHaveBeenCalled()
    expect(fulfilOrder).not.toHaveBeenCalled()
  })
})
