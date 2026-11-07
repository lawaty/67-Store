import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { client } from "@/accounts"
import { gamingProfile } from "@/accounts"
import { product } from '@/catalogue'
import { money } from "@/shared/money"
import { readStorefront, presentProduct } from "./storefront"
import { defaultLevelsFor, levelsToCurve, markup, quote, resolveMarkupBasisPoints } from "@/ordering"

const now = new Date("2026-11-06T00:00:00.000Z")

type FakeContainerOverrides = Partial<Omit<Container, "orders">> & { orders?: Partial<Container["orders"]> }

function fakeContainer(overrides: FakeContainerOverrides = {}): Container {
  const products = [
    product({ id: "p1", distributorId: "d1", name: "86", cost: money(10000, "USD"), game: "mlbb" }),
    product({ id: "p2", distributorId: "d2", name: "Weekly", cost: money(20000, "USD"), game: "mlbb" }),
  ]

  const base: Container = {
    operationsMode: async () => "live",
    products: {
      listActive: async () => products,
      listAll: async () => products,
      upsertMany: async () => {},
      deactivateExcept: async () => 0,
    },
    clients: {
      findById: async () => client("c1"),
      save: async () => {},
    } as never,
    settings: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      all: async () => ({}),
    },
    gamingProfiles: {
      listByAccount: async () => [
        gamingProfile({ id: "g1", accountId: "a1", label: "Main", userId: "1", serverId: "2", game: "mlbb" }),
      ],
      add: async () => {},
      remove: async () => {},
    },
    orders: {
      save: vi.fn(async () => {}),
      findById: vi.fn(async () => null),
      findByToken: vi.fn(async () => null),
      update: vi.fn(async () => {}),
      listRecent: vi.fn(async () => []),
      listByClient: vi.fn(async () => []),
      findByDistributorOrderId: vi.fn(async () => null),
      listByStatus: vi.fn(async () => []),
      search: vi.fn(async () => ({ rows: [], total: 0 })),
      sumCoinsChargedSince: vi.fn(async () => 0),
    },
    activity: { sumQualifiedVolumeSince: vi.fn(async () => 0) },
    distributor: {
      checkPlayer: async () => ({ valid: true, name: "Player" }),
      placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
      getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
      getBalance: async () => ({ balanceMinor: 99999999 }),
    },
    coinSupply: { totalCoins: async () => 0 },
    treasury: {
      snapshot: async () => ({ usdtMinor: 99999999, basisEgpMinor: 0, wacEgpMinor: 0 }),
    } as unknown as Container["treasury"],
  } as unknown as Container

  return {
    ...base,
    ...overrides,
    orders: { ...base.orders, ...(overrides.orders ?? {}) },
  }
}

describe("readStorefront", () => {
  it("prices the catalogue with the default topup markup and precomputes egp and coins", async () => {
    const storefront = await readStorefront(
      fakeContainer(),
      { accountId: "a1", clientId: "c1" },
      "default",
      now,
    )

    expect(storefront.signedIn).toBe(true)
    expect(storefront.products[0].price).toEqual(money(12000, "USD"))
    expect(storefront.products[0].egp).toEqual(money(582000, "EGP"))
    expect(storefront.products[0].coins).toBe(12000)
    expect(storefront.coinValue).toBe(0.01)
    expect(storefront.profiles).toHaveLength(1)
  })

  it("uses base markup for a client when no curve or override applies", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) => (key === "markup:base:mlbb" ? "3000" : key === "markup:reseller:mlbb" ? "1000" : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "client", now)

    expect(storefront.products[0].price).toEqual(money(13000, "USD"))
  })

  it("changes displayed price via the VIP curve from consumption", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) =>
          key === "markup:vip:mlbb"
            ? JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
            : null,
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      activity: { sumQualifiedVolumeSince: async () => 5000 },
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "client", now)

    expect(storefront.products[0].price).toEqual(money(11500, "USD")) // 10000 * 1.15
  })

  it("per-client override wins over the curve for that client only", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) => {
          if (key === "markup:override:c1") return JSON.stringify({ basisPoints: 500, updatedAt: "2026-11-01T00:00:00Z" })
          if (key === "markup:vip:mlbb")
            return JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      activity: { sumQualifiedVolumeSince: async () => 5000 },
    })

    const overridden = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "client", now)
    expect(overridden.products[0].price).toEqual(money(10500, "USD"))

    const other = await readStorefront(
      fakeContainer({
        clients: { findById: async () => client("c2"), save: async () => {} } as never,
        settings: container.settings,
      activity: { sumQualifiedVolumeSince: async () => 5000 },
      }),
      { accountId: "a2", clientId: "c2" },
      "client",
      now,
    )
    expect(other.products[0].price).toEqual(money(11500, "USD"))
  })

  it("guest uses base markup and does not query consumption", async () => {
    const sumQualifiedVolumeSince = vi.fn(async () => 9999)
    const container = fakeContainer({
      settings: {
        get: async (key: string) =>
          key === "markup:vip:mlbb"
            ? JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
            : key === "markup:topup_client:mlbb"
              ? "2500"
              : null,
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      activity: { sumQualifiedVolumeSince } as never,
    })

    const storefront = await readStorefront(container, { accountId: null, clientId: null }, "client", now)

    expect(sumQualifiedVolumeSince).not.toHaveBeenCalled()
    expect(storefront.products[0].price).toEqual(money(12000, "USD")) // curve base point (0 consumption), no tier
  })

  it("guest with no curve uses legacy topup markup and does not query consumption", async () => {
    const sumQualifiedVolumeSince = vi.fn(async () => 9999)
    const container = fakeContainer({
      settings: {
        get: async (key: string) => (key === "markup:topup_client:mlbb" ? "2500" : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      activity: { sumQualifiedVolumeSince } as never,
    })

    const storefront = await readStorefront(container, { accountId: null, clientId: null }, "client", now)

    expect(sumQualifiedVolumeSince).not.toHaveBeenCalled()
    expect(storefront.products[0].price).toEqual(money(12500, "USD"))
  })

  it("passes since = now − 30 days to sumQualifiedVolumeSince", async () => {
    const sumQualifiedVolumeSince = vi.fn(async () => 0)
    const container = fakeContainer({ activity: { sumQualifiedVolumeSince } })

    await readStorefront(container, { accountId: "a1", clientId: "c1" }, "client", now)

    expect(sumQualifiedVolumeSince).toHaveBeenCalledWith("c1", new Date("2026-10-07T00:00:00.000Z"))
  })

  it("derives the markup from the legacy base via default levels when no curve or base is configured", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) => (key === "markup:topup_client:mlbb" ? "3000" : key === "markup:reseller:mlbb" ? "1000" : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      activity: { sumQualifiedVolumeSince: async () => 999999 },
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "client", now)

    const expectedMarkup = resolveMarkupBasisPoints(levelsToCurve(defaultLevelsFor(3000)), 999999)
    expect(storefront.products[0].price).toEqual(quote(money(10000, "USD"), markup(expectedMarkup)))
  })

  it("returns no profiles for a guest", async () => {
    const storefront = await readStorefront(fakeContainer(), { accountId: null, clientId: null }, "client", now)

    expect(storefront.signedIn).toBe(false)
    expect(storefront.profiles).toEqual([])
  })

  it("marks numeric product names as diamonds", async () => {
    const storefront = await readStorefront(fakeContainer(), { accountId: null, clientId: null }, "default", now)

    expect(storefront.products.map((item) => item.isDiamond)).toEqual([true, false])
  })

  it("uses coin index USD value for coins", () => {
    const p = product({ id: "p", distributorId: "d", name: "86", cost: money(84, "USD"), game: "mlbb" })
    expect(presentProduct(p, markup(2000), 48.5, 100, { buyable: true, fundingGapMinor: 0, unavailableReason: null }).coins).toBe(2)
  })

  it("marks available-affordable products buyable with no funding gap", async () => {
    const container = fakeContainer({
      treasury: {
        snapshot: async () => ({ usdtMinor: 25000, basisEgpMinor: 0, wacEgpMinor: 0 }),
      } as unknown as Container["treasury"],
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "default", now)

    expect(storefront.products[0]).toMatchObject({
      id: "p1",
      buyable: true,
      fundingGapMinor: 0,
      unavailableReason: null,
      directPayAvailable: true,
    })
  })

  it("reports insufficient available funds with funding gap and blocks direct pay", async () => {
    const container = fakeContainer({
      treasury: {
        snapshot: async () => ({ usdtMinor: 15000, basisEgpMinor: 0, wacEgpMinor: 0 }),
      } as unknown as Container["treasury"],
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "default", now)

    expect(storefront.products.map((p) => [p.id, p.buyable, p.fundingGapMinor, p.unavailableReason, p.directPayAvailable])).toEqual([
      ["p1", true, 0, null, true],
      ["p2", false, 5000, "insufficient_funds", false],
    ])
  })

  it("reduces available by reserved coins when deciding direct-pay availability", async () => {
    const container = fakeContainer({
      treasury: {
        snapshot: async () => ({ usdtMinor: 25000, basisEgpMinor: 0, wacEgpMinor: 0 }),
      } as unknown as Container["treasury"],
      // 10000 outstanding coins at 1 minor each reserve 10000, so recorded
      // 25000 leaves only 15000 available: p1 (10000) still buyable, p2 (20000) not.
      coinSupply: { totalCoins: async () => 10000 },
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "default", now)

    expect(storefront.products.map((p) => [p.id, p.buyable, p.fundingGapMinor, p.unavailableReason, p.directPayAvailable])).toEqual([
      ["p1", true, 0, null, true],
      ["p2", false, 5000, "insufficient_funds", false],
    ])
  })

  it("marks all products unknown when recorded snapshot fails and does not read live balance", async () => {
    const getBalance = vi.fn(async () => ({ balanceMinor: 99999999 }))
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
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "default", now)

    expect(getBalance).not.toHaveBeenCalled()
    expect(storefront.products.every((p) => p.buyable === false && p.unavailableReason === "unknown_balance" && p.directPayAvailable === false)).toBe(true)
  })

  it("uses available treasury for direct pay, not live distributor balance", async () => {
    const getBalance = vi.fn(async () => ({ balanceMinor: 99999999 }))
    const container = fakeContainer({
      distributor: {
        checkPlayer: async () => ({ valid: true, name: "Player" }),
        placeOrder: async () => ({ distributorOrderId: "d1", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d1", status: "COMPLETED" }),
        getBalance,
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 12000, basisEgpMinor: 0, wacEgpMinor: 0 }),
      } as unknown as Container["treasury"],
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "default", now)

    expect(getBalance).not.toHaveBeenCalled()
    expect(storefront.products.map((p) => [p.id, p.directPayAvailable, p.buyable])).toEqual([
      ["p1", true, true],
      ["p2", false, false],
    ])
  })

  it("presents every product as buyable in sandbox even when treasury is insufficient, without reading treasury", async () => {
    const snapshot = vi.fn(async () => ({ usdtMinor: 0, basisEgpMinor: 0, wacEgpMinor: 0 }))
    const container = fakeContainer({
      operationsMode: async () => "sandbox",
      treasury: { snapshot } as unknown as Container["treasury"],
    })

    const storefront = await readStorefront(container, { accountId: "a1", clientId: "c1" }, "default", now)

    expect(snapshot).not.toHaveBeenCalled()
    expect(storefront.products.length).toBeGreaterThan(0)
    expect(storefront.products.every((p) => p.buyable === true && p.fundingGapMinor === 0)).toBe(true)
    expect(storefront.products.map((p) => [p.id, p.buyable, p.fundingGapMinor, p.unavailableReason, p.directPayAvailable])).toEqual([
      ["p1", true, 0, null, true],
      ["p2", true, 0, null, true],
    ])
  })
})
