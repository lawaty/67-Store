import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import type { Order } from "@/ordering"
import { client } from "@/accounts"
import { product } from '@/catalogue'
import { defaultLevelsFor, levelsToCurve, order, resolveMarkupBasisPoints } from "@/ordering"
import { player } from "@/ordering"
import { money } from "@/shared/money"
import { payment } from "@/payments"
import { checkout, type CheckoutInput } from "./checkout"

const item = product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" })
const buyer = client("c1")

const created = order({
  id: "o1",
  token: "t1",
  client: buyer,
  product: item,
  player: player("1", "2"),
  price: money(12000, "USD"),
  status: "CREATED",
  coinValueMinor: 100,
  markupBasisPoints: 2000,
})

const input: CheckoutInput = {
  productId: "p1",
  method: "egp",
  profileId: "",
  label: "",
  userId: "1",
  serverId: "2",
  promoCode: "",
  locale: "en",
}

const guest = { accountId: null, clientId: null }
const member = { accountId: "a1", clientId: "c1" }
const now = new Date("2026-11-06T00:00:00.000Z")

function fakeContainer(overrides: Partial<Container> = {}): Container {
  return {
    operationsMode: async () => "live",
    products: {
      listActive: async () => [item],
      listAll: async () => [item],
      upsertMany: async () => {},
      deactivateExcept: async () => 0,
      appendCostHistory: async () => {},
    },
    gamingProfiles: { listByAccount: async () => [], add: async () => {}, remove: async () => {} },
    distributor: {
      checkPlayer: async () => ({ valid: true, name: "Player" }),
      placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
      getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
      getBalance: async () => ({ balanceMinor: 99999999 }),
    },
    coinSupply: { totalCoins: async () => 0 },
    treasury: {
      snapshot: async () => ({ usdtMinor: 99999999, basisEgpMinor: 0, wacEgpMinor: 0 }),
    },
    clients: { findById: async () => buyer, save: async () => {} },
    settings: { get: async () => null, set: async () => {}, delete: async () => {}, all: async () => ({}) },

    promos: {
      listAll: async () => [],
      create: async () => {},
      setActive: async () => {},
      redeem: async () => ({ ok: false as const, reason: "unknown" as const }),
    },
    placeOrder: async () => ({ order: created, promoError: null as "unknown" | "inactive" | "expired" | "exhausted" | null }),
    orders: {
      update: async () => {},
      save: async () => {},
      findById: async () => created,
      findByToken: async () => created,
      listRecent: async () => [],
      listByClient: async () => [],
      findByDistributorOrderId: async () => null,
      listByStatus: async () => [],
      search: async () => ({ rows: [], total: 0 }),
      sumCoinsChargedSince: async () => 0,
    },
    activity: { sumQualifiedVolumeSince: async () => 0 },
    wallets: {
      debit: async () => true,
      credit: async () => ({ clientId: "c1", coinBalance: 0 }),
      getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
      listEntries: async () => [],
    },
    payments: { save: async () => {}, findByProviderReference: async () => null, markStatus: async () => {} },
    startPayment: async (args: { order: Order; provider: "INSTAPAY" | "CRYPTO" | "COINS"; returnUrl: string }) => ({
      payment: payment({
        id: "pay",
        orderId: args.order.id,
        provider: args.provider,
        providerReference: "ref",
        amount: args.order.price,
        status: "PENDING",
      }),
      redirectUrl: "/checkout/fake/ref",
    }),
    confirmPayment: async () => null,
    fulfilOrder: async (value: Order) => value,
    syncCatalogue: async () => ({ synced: 0, deactivated: 0 }),
    alerts: { append: async () => ({ id: "a", kind: "k", message: "m", createdAt: "now" }), listRecent: async () => [] },
    checkPrice: async () => ({ status: "ok" as const }),
    syncFulfilment: async () => null,
    accounts: {} as never,
    ...overrides,
  } as unknown as Container
}

const deps = { newId: () => "id", allowFakeFulfilment: false, now: () => now }
const curve = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })

describe("checkout", () => {
  it("rejects an unknown product", async () => {
    const container = fakeContainer({
      products: {
        listActive: async () => [],
        listAll: async () => [],
        upsertMany: async () => {},
        deactivateExcept: async () => 0,
        appendCostHistory: async () => {},
      },
    })

    expect(await checkout(container, guest, input, deps)).toEqual({ ok: false, error: "product" })
  })

  it("rejects an empty player id before calling the distributor", async () => {
    const checkPlayer = vi.fn(async () => ({ valid: true, name: "Player" }))
    const container = fakeContainer({
      distributor: {
        checkPlayer,
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    expect(await checkout(container, guest, { ...input, userId: "" }, deps)).toEqual({
      ok: false,
      error: "player",
    })
    expect(checkPlayer).not.toHaveBeenCalled()
  })

  it("rejects a player the distributor cannot verify", async () => {
    const container = fakeContainer({
      distributor: {
        checkPlayer: async () => ({ valid: false, name: null }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
        getBalance: async () => ({ balanceMinor: 0 }),
      },
    })

    expect(await checkout(container, guest, input, deps)).toEqual({ ok: false, error: "player" })
  })

  it("reports an unknown promo code", async () => {
    expect(await checkout(fakeContainer(), guest, { ...input, promoCode: "NOPE" }, deps)).toEqual({
      ok: false,
      error: "promo-unknown",
    })
  })

  it("requires a login before paying with coins", async () => {
    expect(await checkout(fakeContainer(), guest, { ...input, method: "coins" }, deps)).toEqual({
      ok: false,
      error: "login",
    })
  })

  it("reports insufficient coins", async () => {
    const container = fakeContainer({
      wallets: {
        debit: async () => false,
        credit: async () => ({ clientId: "c1", coinBalance: 0 }),
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
        listEntries: async () => [],
      },
    })

    expect(await checkout(container, member, { ...input, method: "coins" }, deps)).toEqual({
      ok: false,
      error: "coins",
    })
  })

  it("pays with coins, records the payment and fulfils when allowed", async () => {
    const update = vi.fn(async () => {})
    const save = vi.fn(async () => {})
    const fulfil = vi.fn(async (value: Order) => value)
    const debit = vi.fn(async () => true)

    const container = fakeContainer({
      orders: {
        update,
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
      wallets: {
        debit,
        credit: async () => ({ clientId: "c1", coinBalance: 0 }),
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
        listEntries: async () => [],
      },
      payments: { save, findByProviderReference: async () => null, markStatus: async () => {} },
      fulfilOrder: fulfil,
    })

    const result = await checkout(
      container,
      member,
      { ...input, method: "coins" },
      { newId: () => "id", allowFakeFulfilment: true },
    )

    expect(result).toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(debit).toHaveBeenCalledWith("c1", 12000, "order:o1")
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "COINS", status: "PAID", providerReference: "coins:o1" }),
    )
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "PAID", coinsCharged: 12000, coinsConsumed: 12000 }))
    expect(fulfil).toHaveBeenCalledWith(expect.objectContaining({ status: "PAID" }))
  })

  it("pays with coins using coin index value", async () => {
    const update = vi.fn(async () => {})
    const save = vi.fn(async () => {})
    const fulfil = vi.fn(async (value: Order) => value)
    const debit = vi.fn(async () => true)

    const container = fakeContainer({
      settings: {
        get: async (key: string) => (key === "coin:index_micro" ? "1000000" : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      orders: {
        update,
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
      wallets: {
        debit,
        credit: async () => ({ clientId: "c1", coinBalance: 0 }),
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
        listEntries: async () => [],
      },
      payments: { save, findByProviderReference: async () => null, markStatus: async () => {} },
      fulfilOrder: fulfil,
    })

    const result = await checkout(
      container,
      member,
      { ...input, method: "coins" },
      { newId: () => "id", allowFakeFulfilment: true },
    )

    expect(result).toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(debit).toHaveBeenCalledWith("c1", 12000, "order:o1")
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "PAID", coinsCharged: 12000, coinsConsumed: 12000 }))
  })

  it("starts an INSTAPAY payment for the egp method", async () => {
    const startPayment = vi.fn(async (args: { order: Order; provider: string; returnUrl: string }) => ({
      payment: payment({
        id: "pay",
        orderId: args.order.id,
        provider: "INSTAPAY",
        providerReference: "ref",
        amount: args.order.price,
        status: "PENDING",
      }),
      redirectUrl: "/checkout/fake/ref",
    }))

    const container = fakeContainer({ startPayment: startPayment as never })
    const result = await checkout(container, guest, input, deps)

    expect(result).toEqual({ ok: true, redirectUrl: "/checkout/fake/ref" })
    expect(startPayment).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "INSTAPAY", returnUrl: "/order/t1" }),
    )
  })

  it("starts a CRYPTO payment for the usdt method", async () => {
    const startPayment = vi.fn(async (args: { order: Order; provider: string; returnUrl: string }) => ({
      payment: payment({
        id: "pay",
        orderId: args.order.id,
        provider: "CRYPTO",
        providerReference: "ref",
        amount: args.order.price,
        status: "PENDING",
      }),
      redirectUrl: "/checkout/fake/ref",
    }))

    const container = fakeContainer({ startPayment: startPayment as never })
    await checkout(container, guest, { ...input, method: "usdt" }, deps)

    expect(startPayment).toHaveBeenCalledWith(expect.objectContaining({ provider: "CRYPTO" }))
  })

  it("surfaces a promo rejection from the order use case", async () => {
    const update = vi.fn(async () => {})
    const container = fakeContainer({
      placeOrder: async () => ({ order: created, promoError: "expired" as const }),
      orders: {
        update,
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
    })

    expect(await checkout(container, guest, input, deps)).toEqual({ ok: false, error: "promo-expired" })
  })

  it("proceeds when price check is ok", async () => {
    const checkPrice = vi.fn(async () => ({ status: "ok" as const }))
    const container = fakeContainer({ checkPrice: checkPrice as never })
    const result = await checkout(container, guest, input, deps)
    expect(result).toEqual({ ok: true, redirectUrl: "/checkout/fake/ref" })
    expect(checkPrice).toHaveBeenCalled()
  })

  it("returns price error when price check is held and leaves fakes untouched", async () => {
    const placeOrder = vi.fn(async () => ({ order: created, promoError: null as "unknown" | "inactive" | "expired" | "exhausted" | null }))
    const debit = vi.fn(async () => true)
    const save = vi.fn(async () => {})
    const container = fakeContainer({
      checkPrice: async () => ({ status: "held" as const, driftBasisPoints: 300 }),
      placeOrder,
      wallets: { debit, credit: async () => ({ clientId: "c1", coinBalance: 0 }), getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }), listEntries: async () => [] },
      payments: { save, findByProviderReference: async () => null, markStatus: async () => {} },
    })
    expect(await checkout(container, guest, input, deps)).toEqual({ ok: false, error: "price" })
    expect(placeOrder).not.toHaveBeenCalled()
    expect(debit).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })

  it("returns price error when price check is stale and leaves fakes untouched", async () => {
    const placeOrder = vi.fn(async () => ({ order: created, promoError: null as "unknown" | "inactive" | "expired" | "exhausted" | null }))
    const container = fakeContainer({
      checkPrice: async () => ({ status: "stale" as const }),
      placeOrder,
    })
    expect(await checkout(container, guest, input, deps)).toEqual({ ok: false, error: "price" })
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("charges a price derived from VIP curve consumption", async () => {
    const sumQualifiedVolumeSince = vi.fn(async () => 5000)
    const placeOrder = vi.fn(async (args: { order?: Order } & Record<string, unknown>) => ({
      order: { ...created, markupBasisPoints: 1500 },
      promoError: null as null,
      _markup: args.markup,
    }))
    const container = fakeContainer({
      settings: { get: async (key: string) => (key === "markup:vip:mlbb" ? curve : null), set: async () => {}, delete: async () => {}, all: async () => ({}) },
      activity: { sumQualifiedVolumeSince },
      orders: {
        update: async () => {},
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
      placeOrder: placeOrder as never,
    })

    await checkout(container, member, input, deps)

    expect(sumQualifiedVolumeSince).toHaveBeenCalledWith("c1", new Date("2026-10-07T00:00:00.000Z"))
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ markup: { basisPoints: 1500 } }))
  })

  it("per-client override wins over the curve for that client only", async () => {
    const placeOrder = vi.fn(async (args: Record<string, unknown>) => ({ order: { ...created, markupBasisPoints: 500 }, promoError: null as null, _markup: args.markup }))
    const container = fakeContainer({
      settings: {
        get: async (key: string) => {
          if (key === "markup:override:c1") return JSON.stringify({ basisPoints: 500, updatedAt: "2026-11-01T00:00:00Z" })
          if (key === "markup:vip:mlbb") return curve
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      activity: { sumQualifiedVolumeSince: async () => 5000 },
      orders: {
        update: async () => {},
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
      placeOrder: placeOrder as never,
    })

    await checkout(container, member, input, deps)
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ markup: { basisPoints: 500 } }))
  })

  it("guest checkout uses base markup and does not query consumption", async () => {
    const sumQualifiedVolumeSince = vi.fn(async () => 9999)
    const placeOrder = vi.fn(async (args: Record<string, unknown>) => ({ order: created, promoError: null as null, _markup: args.markup }))
    const container = fakeContainer({
      settings: { get: async (key: string) => (key === "markup:vip:mlbb" ? curve : null), set: async () => {}, delete: async () => {}, all: async () => ({}) },
      activity: { sumQualifiedVolumeSince },
      orders: {
        update: async () => {},
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
      placeOrder: placeOrder as never,
    })

    await checkout(container, guest, input, deps)

    expect(sumQualifiedVolumeSince).not.toHaveBeenCalled()
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ markup: { basisPoints: 2000 } }))
  })

  it("derives the markup from the legacy base via default levels when no curve is configured", async () => {
    const expectedMarkup = resolveMarkupBasisPoints(levelsToCurve(defaultLevelsFor(3000)), 999999)
    const placeOrder = vi.fn(async (args: Record<string, unknown>) => ({ order: { ...created, markupBasisPoints: expectedMarkup }, promoError: null as null, _markup: args.markup }))
    const container = fakeContainer({
      settings: { get: async (key: string) => (key === "markup:topup_client:mlbb" ? "3000" : null), set: async () => {}, delete: async () => {}, all: async () => ({}) },
      activity: { sumQualifiedVolumeSince: async () => 999999 },
      orders: {
        update: async () => {},
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
      placeOrder: placeOrder as never,
    })

    await checkout(container, member, input, deps)

    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ markup: { basisPoints: expectedMarkup } }))
  })

  it("returns unavailable for an unbuyable product before player validation, order creation, coin debit, or payment", async () => {
    const checkPlayer = vi.fn(async () => ({ valid: true, name: "Player" }))
    const placeOrder = vi.fn(async () => ({ order: created, promoError: null as null }))
    const debit = vi.fn(async () => true)
    const startPayment = vi.fn(async () => ({ payment: {} as never, redirectUrl: "/x" }))
    const save = vi.fn(async () => {})
    const container = fakeContainer({
      distributor: {
        checkPlayer,
        placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
        getBalance: vi.fn(async () => ({ balanceMinor: 99999999 })),
      },
      treasury: { snapshot: async () => ({ usdtMinor: 5000, basisEgpMinor: 0, wacEgpMinor: 0 }) } as unknown as Container["treasury"],
      placeOrder: placeOrder as never,
      wallets: {
        debit,
        credit: async () => ({ clientId: "c1", coinBalance: 0 }),
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
        listEntries: async () => [],
      },
      payments: { save, findByProviderReference: async () => null, markStatus: async () => {} },
      startPayment: startPayment as never,
    })

    expect(await checkout(container, member, { ...input, method: "egp" }, deps)).toEqual({ ok: false, error: "unavailable" })
    expect(checkPlayer).not.toHaveBeenCalled()
    expect(placeOrder).not.toHaveBeenCalled()
    expect(debit).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    expect(startPayment).not.toHaveBeenCalled()
  })

  it("blocks direct-pay checkout when reserved coins reduce available below cost, even though recorded covers it", async () => {
    const checkPlayer = vi.fn(async () => ({ valid: true, name: "Player" }))
    const placeOrder = vi.fn(async () => ({ order: created, promoError: null as null }))
    const startPayment = vi.fn(async () => ({ payment: {} as never, redirectUrl: "/x" }))
    const container = fakeContainer({
      distributor: {
        checkPlayer,
        placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
        getBalance: async () => ({ balanceMinor: 99999999 }),
      },
      // Recorded 15000 covers the 10000 cost, but 10000 outstanding coins at
      // 1 minor each reserve 10000, leaving only 5000 available.
      treasury: { snapshot: async () => ({ usdtMinor: 15000, basisEgpMinor: 0, wacEgpMinor: 0 }) } as unknown as Container["treasury"],
      coinSupply: { totalCoins: async () => 10000 },
      placeOrder: placeOrder as never,
      startPayment: startPayment as never,
    })

    expect(await checkout(container, guest, { ...input, method: "egp" }, deps)).toEqual({ ok: false, error: "unavailable" })
    expect(checkPlayer).not.toHaveBeenCalled()
    expect(placeOrder).not.toHaveBeenCalled()
    expect(startPayment).not.toHaveBeenCalled()
  })

  it("returns unavailable when recorded treasury snapshot fails", async () => {
    const getBalance = vi.fn(async () => ({ balanceMinor: 99999999 }))
    const placeOrder = vi.fn(async () => ({ order: created, promoError: null as null }))
    const container = fakeContainer({
      distributor: {
        checkPlayer: async () => ({ valid: true, name: "Player" }),
        placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
        getBalance,
      },
      treasury: {
        snapshot: async () => {
          throw new Error("boom")
        },
      } as unknown as Container["treasury"],
      placeOrder: placeOrder as never,
    })

    expect(await checkout(container, guest, input, deps)).toEqual({ ok: false, error: "unavailable" })
    expect(getBalance).not.toHaveBeenCalled()
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("allows affordable direct-pay checkout using available treasury, not live balance", async () => {
    const getBalance = vi.fn(async () => ({ balanceMinor: 0 }))
    const startPayment = vi.fn(async (args: { order: Order; provider: string; returnUrl: string }) => ({
      payment: payment({
        id: "pay",
        orderId: args.order.id,
        provider: "INSTAPAY",
        providerReference: "ref",
        amount: args.order.price,
        status: "PENDING",
      }),
      redirectUrl: "/checkout/fake/ref",
    }))
    const container = fakeContainer({
      distributor: {
        checkPlayer: async () => ({ valid: true, name: "Player" }),
        placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
        getBalance,
      },
      treasury: { snapshot: async () => ({ usdtMinor: 10000, basisEgpMinor: 0, wacEgpMinor: 0 }) } as unknown as Container["treasury"],
      startPayment: startPayment as never,
    })

    expect(await checkout(container, guest, { ...input, method: "egp" }, deps)).toEqual({ ok: true, redirectUrl: "/checkout/fake/ref" })
    expect(getBalance).not.toHaveBeenCalled()
    expect(startPayment).toHaveBeenCalledTimes(1)
  })

  it("skips the availability gate in sandbox even when treasury is empty", async () => {
    const checkPlayer = vi.fn(async () => ({ valid: true, name: "Player" }))
    const snapshot = vi.fn(async () => ({ usdtMinor: 0, basisEgpMinor: 0, wacEgpMinor: 0 }))
    const startPayment = vi.fn(async (args: { order: Order; provider: string; returnUrl: string }) => ({
      payment: payment({
        id: "pay",
        orderId: args.order.id,
        provider: "INSTAPAY",
        providerReference: "ref",
        amount: args.order.price,
        status: "PENDING",
      }),
      redirectUrl: "/checkout/fake/ref",
    }))
    const container = fakeContainer({
      operationsMode: async () => "sandbox",
      distributor: {
        checkPlayer,
        placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
        getBalance: async () => ({ balanceMinor: 0 }),
      },
      treasury: { snapshot } as unknown as Container["treasury"],
      startPayment: startPayment as never,
    })

    const result = await checkout(container, guest, { ...input, method: "egp" }, deps)

    expect(result).toEqual({ ok: true, redirectUrl: "/checkout/fake/ref" })
    expect(checkPlayer).toHaveBeenCalled()
    expect(snapshot).not.toHaveBeenCalled()
    expect(startPayment).toHaveBeenCalledTimes(1)
  })

  it("does not apply coverage guard to coins method", async () => {
    const update = vi.fn(async () => {})
    const save = vi.fn(async () => {})
    const fulfil = vi.fn(async (value: Order) => value)
    const debit = vi.fn(async () => true)
    const container = fakeContainer({
      distributor: {
        checkPlayer: async () => ({ valid: true, name: "Player" }),
        placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
        getBalance: async () => ({ balanceMinor: 0 }),
      },
      coinSupply: { totalCoins: async () => 999999 },
      settings: { get: async () => null, set: async () => {}, delete: async () => {}, all: async () => ({}) },
      orders: {
        update,
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
        },
      wallets: {
        debit,
        credit: async () => ({ clientId: "c1", coinBalance: 0 }),
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
        listEntries: async () => [],
      },
      payments: { save, findByProviderReference: async () => null, markStatus: async () => {} },
      fulfilOrder: fulfil,
    })

    const result = await checkout(container, member, { ...input, method: "coins" }, { newId: () => "id", allowFakeFulfilment: true, now: () => now })
    expect(result).toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(debit).toHaveBeenCalled()
  })



  it("passes and stores coinValueMinor snapshot", async () => {
    const placeOrder = vi.fn(async (args: Record<string, unknown>) => ({
      order: { ...created, coinValueMinor: args.coinValueMinor as number },
      promoError: null,
    }))
    const update = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async (key: string) => (key === "coin:index_micro" ? "2500000" : null), set: async () => {}, delete: async () => {}, all: async () => ({}) },
      placeOrder: placeOrder as never,
      orders: {
        update,
        save: async () => {},
        findById: async () => created,
        findByToken: async () => created,
        listRecent: async () => [],
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        search: async () => ({ rows: [], total: 0 }),
        sumCoinsChargedSince: async () => 0,
      },
    })

    await checkout(container, guest, input, deps)
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ coinValueMinor: 3 }))
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ coinValueMinor: 3 }))
  })

})
