import { afterEach, describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { client } from "@/accounts"
import { product } from '@/catalogue'
import { defaultLevelsFor, levelsToCurve, order, resolveMarkupBasisPoints } from "@/ordering"
import { player } from "@/ordering"
import { money } from "@/shared/money"
import { readOperationsMode } from "@/shared/operations-mode"
import { EGP_RATE_KEY, P2P_RATE_HISTORY_KEY, P2P_RATE_LAST_KEY, P2P_RATE_MANUAL_KEY } from "@/treasury"
import {
  adjustWallet,
  clearMarkupOverride,
  createPromo,
  listProducts,
  listUsers,
  readAdminStats,
  readDashboard,
  readSettings,
  readTreasuryDashboard,
  readUser,
  recordDeposit,
  recordFunding,
  rollbackFunding,
  saveMarkupOverride,
  saveP2pSettings,
  saveSettings,
  saveVipLevels,
  searchOrders,
} from "./admin"

const placed = order({
  id: "o1",
  token: "t1",
  client: client("c1"),
  product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(1000, "USD"), game: "mlbb" }),
  player: player("1", "2"),
  price: money(1200, "USD"),
  status: "PAID",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  markupBasisPoints: 0,
})

function fakeContainer(overrides: Partial<Container> = {}): Container {
  const now = new Date().toISOString()
  return {

    promos: {
      create: async () => {},
      listAll: async () => [],
      setActive: async () => {},
      redeem: async () => ({ ok: false as const, reason: "unknown" as const }),
    },
    settings: {
      get: async (key: string) => {
        if (key === EGP_RATE_KEY) return "48.5"
        return null
      },
      set: async () => {},
      delete: async () => {},
      all: async () => ({ [EGP_RATE_KEY]: "48.5" }),
    },
    wallets: {
      credit: async () => ({ clientId: "c1", coinBalance: 0 }),
      debit: async () => true,
      getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
      listEntries: async () => [],
    },
    accounts: {
      list: async () => ({ rows: [], total: 0 }),
      findById: async () => null,
      findByEmail: async () => null,
      create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
      listPreferences: async () => ({}),
      setPreference: async () => {},
    },
    clients: { findById: async () => client("c1"), save: async () => {} },
    orders: {
      listRecent: async () => [placed],
      search: async () => ({ rows: [placed], total: 1 }),
      save: async () => {},
      findById: async () => placed,
      findByToken: async () => placed,
      update: async () => {},
      listByClient: async () => [],
      findByDistributorOrderId: async () => null,
      listByStatus: async () => [],
      sumCoinsChargedSince: async () => 0,
    },
    activity: { sumQualifiedVolumeSince: async () => 0 },
    distributor: {
      getBalance: async () => ({ balanceMinor: 100000 }),
      checkPlayer: async () => ({ valid: true, name: "P" }),
      placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
      getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
    },
    products: {
      listActive: async () => [
        product({ id: "p1", distributorId: "d1", name: "cheap", cost: money(50000, "USD"), game: "mlbb" }),
        product({ id: "p2", distributorId: "d2", name: "expensive", cost: money(200000, "USD"), game: "mlbb" }),
      ],
      listAll: async () => [],
      upsertMany: async () => {},
      deactivateExcept: async () => 0,
      appendCostHistory: async () => {},
    },
    treasury: {
      snapshot: async () => ({ usdtMinor: 0, basisEgpMinor: 0, wacEgpMinor: 0 }),
      recordFunding: async () => ({
        id: "f",
        egpPaidMinor: 0,
        usdtMinor: 0,
        createdAt: "now",
      }),

      consumeForOrder: async () => {
        throw new Error("unused")
      },
      reconcile: async () => ({
        id: "r",
        expectedUsdtMinor: 0,
        supplierUsdtMinor: 0,
        gapUsdtMinor: 0,
        status: "OK",
        createdAt: "now",
      }),
    } as any,
    coinSupply: { totalCoins: async () => 0 },
    fundings: { append: async () => {}, totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }), listRecent: async () => [], findById: async () => null, remove: async () => false },
    consumptions: { append: async () => {}, totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }), findByOrder: async () => null, sumUsdtSince: async () => 0, listRecent: async () => [] },
    reconciliations: { append: async () => {}, latest: async () => null },
    deposits: { append: async () => {}, list: async () => [], listByClient: async () => [], listRecent: async () => [], listSince: async () => [], coinWacEgpMinor: async () => 0 },
    orderReport: {
      summarySince: async () => ({ deliveredCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0 }),
      dailySeriesSince: async () => [],
      wacSeriesSince: async () => [],
      clientSummarySince: async () => [],
    },
    alerts: { append: async () => ({ id: "a", kind: "k", message: "m", createdAt: now }), listRecent: async () => [] },
    p2pRate: { read: async () => null },
    operationsMode: async () => "sandbox",
    liveReady: false,
    syncCatalogue: async () => ({ synced: 0, deactivated: 0 }),
    checkPrice: async () => ({ ok: true } as any),
    placeOrder: async () => ({} as any),
    startPayment: async () => ({} as any),
    confirmPayment: async () => ({} as any),
    fulfilOrder: async () => ({} as any),
    syncFulfilment: async () => ({} as any),
    reconcileTreasury: async () => ({ id: "r", expectedUsdtMinor: 0, supplierUsdtMinor: 0, gapUsdtMinor: 0, status: "OK", createdAt: now } as any),
    recordDeposit: async () => ({ ok: true } as any),
    ...overrides,
  } as unknown as Container
}


describe("createPromo", () => {
  it("rejects an empty code", async () => {
    expect(
      await createPromo(fakeContainer(), { code: "  ", kind: "PERCENT", value: 10, maxUses: "", expiresAt: "" }, () => "id"),
    ).toEqual({ ok: false, error: "code" })
  })

  it("rejects an unknown kind", async () => {
    expect(
      await createPromo(fakeContainer(), { code: "SAVE", kind: "OTHER", value: 10, maxUses: "", expiresAt: "" }, () => "id"),
    ).toEqual({ ok: false, error: "kind" })
  })

  it("creates a percentage promo", async () => {
    const create = vi.fn(async () => {})
    const container = fakeContainer({
      promos: { create, listAll: async () => [], setActive: async () => {}, redeem: async () => ({ ok: false as const, reason: "unknown" as const }) },
    })

    const result = await createPromo(container, { code: " save ", kind: "PERCENT", value: 10, maxUses: "", expiresAt: "" }, () => "id")

    expect(result).toEqual({ ok: true })
    expect(create).toHaveBeenCalledWith({
      id: "id",
      code: "SAVE",
      kind: "PERCENT",
      basisPoints: 1000,
      amountMinor: null,
      maxUses: null,
      expiresAt: null,
    })
  })

  it("converts a fixed EGP amount to USD minor at today's rate", async () => {
    const create = vi.fn(async () => {})
    const container = fakeContainer({
      promos: { create, listAll: async () => [], setActive: async () => {}, redeem: async () => ({ ok: false as const, reason: "unknown" as const }) },
    })

    await createPromo(container, { code: "FIX", kind: "FIXED", value: 100, maxUses: "", expiresAt: "" }, () => "id")

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 206, basisPoints: null }))
  })

  it("rejects a non-positive usage limit and an invalid date", async () => {
    expect(
      await createPromo(fakeContainer(), { code: "S", kind: "PERCENT", value: 10, maxUses: "0", expiresAt: "" }, () => "id"),
    ).toEqual({ ok: false, error: "maxuses" })

    expect(
      await createPromo(fakeContainer(), { code: "S", kind: "PERCENT", value: 10, maxUses: "", expiresAt: "nope" }, () => "id"),
    ).toEqual({ ok: false, error: "date" })
  })
})

describe("readSettings", () => {
  it("falls back to the documented defaults", async () => {
    expect(await readSettings(fakeContainer())).toEqual({
      vipCurve: [
        { coins: 0, basisPoints: 2000 },
        { coins: 1000, basisPoints: 1500 },
        { coins: 5000, basisPoints: 1000 },
      ],
      vipLevels: [
        { key: "epic", coins: 0, basisPoints: 2000, title: "Epic", icon: "shield", color: "sky" },
        { key: "mythic", coins: 1000, basisPoints: 1500, title: "Mythic", icon: "gem", color: "gold" },
        { key: "immortal", coins: 5000, basisPoints: 1000, title: "Immortal", icon: "flame", color: "ember" },
      ],
      egpRate: "48.5",
      coinIndex: 1,
      coinValueUsd: 0.01,
      coinIndexCapBps: 500,
      coinIndexUpdatedAt: null,
      coinIndexLastMoveBps: null,
      coinIndexCapped: false,
      p2pRateEgp: null,
      defaultMethod: "instapay",
    })
  })

  it("maps coin index last move and capped from coin:index_last_run", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) =>
          key === "coin:index_last_run"
            ? JSON.stringify({
                fromIndexMicro: 1_000_000,
                toIndexMicro: 1_050_000,
                meanRatioBps: 10_500,
                capped: true,
                products: 3,
                at: "2024-06-01T00:00:00.000Z",
              })
            : null,
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    const settings = await readSettings(container)
    expect(settings.coinIndexLastMoveBps).toBe(500)
    expect(settings.coinIndexCapped).toBe(true)
  })

  it("reads p2pRateEgp as decimal when key set to minor", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) => {
          if (key === P2P_RATE_MANUAL_KEY) return "4875"
            if (key === EGP_RATE_KEY) return "48.5"
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    expect(await readSettings(container)).toEqual({
      vipCurve: [
        { coins: 0, basisPoints: 2000 },
        { coins: 1000, basisPoints: 1500 },
        { coins: 5000, basisPoints: 1000 },
      ],
      vipLevels: [
        { key: "epic", coins: 0, basisPoints: 2000, title: "Epic", icon: "shield", color: "sky" },
        { key: "mythic", coins: 1000, basisPoints: 1500, title: "Mythic", icon: "gem", color: "gold" },
        { key: "immortal", coins: 5000, basisPoints: 1000, title: "Immortal", icon: "flame", color: "ember" },
      ],
      egpRate: "48.5",
      coinIndex: 1,
      coinValueUsd: 0.01,
      coinIndexCapBps: 500,
      coinIndexUpdatedAt: null,
      coinIndexLastMoveBps: null,
      coinIndexCapped: false,
      p2pRateEgp: 48.75,
      defaultMethod: "instapay",
    })
  })

  it("reads p2pRateEgp as null when key absent or empty", async () => {
    const containerAbsent = fakeContainer({
      settings: {
        get: async (key: string) => {
            if (key === EGP_RATE_KEY) return "48.5"
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    expect((await readSettings(containerAbsent)).p2pRateEgp).toBeNull()

    const containerEmpty = fakeContainer({
      settings: {
        get: async (key: string) => {
          if (key === P2P_RATE_MANUAL_KEY) return ""
            if (key === EGP_RATE_KEY) return "48.5"
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    expect((await readSettings(containerEmpty)).p2pRateEgp).toBeNull()
  })

  it("seeds vipCurve from base when absent and returns the saved curve", async () => {
    const baseOnly = fakeContainer({
      settings: {
        get: async (key: string) => (key === "markup:base:mlbb" ? "1500" : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    expect((await readSettings(baseOnly)).vipCurve).toEqual([
      { coins: 0, basisPoints: 1500 },
      { coins: 1000, basisPoints: 1000 },
      { coins: 5000, basisPoints: 500 },
    ])

    const saved = JSON.stringify({
      breakpoints: [
        { coins: 0, basisPoints: 2000 },
        { coins: 1000, basisPoints: 1500 },
      ],
    })
    const withCurve = fakeContainer({
      settings: {
        get: async (key: string) => (key === "markup:vip:mlbb" ? saved : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    expect((await readSettings(withCurve)).vipCurve).toEqual([
      { coins: 0, basisPoints: 2000 },
      { coins: 1000, basisPoints: 1500 },
    ])
  })
})

describe("saveSettings", () => {
  it("rejects a non-integer/out-of-range coin index cap", async () => {
    expect(await saveSettings(fakeContainer(), { egpRate: 48.5, coinIndexCapBps: -1 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveSettings(fakeContainer(), { egpRate: 48.5, coinIndexCapBps: 10_001 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveSettings(fakeContainer(), { egpRate: 48.5, coinIndexCapBps: 1.5 })).toEqual({
      ok: false,
      error: "invalid",
    })
  })

  it("stores the rate and the coin index cap without writing markup or coin value", async () => {
    const set = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
    })

    expect(await saveSettings(container, { egpRate: 50, coinIndexCapBps: 250 })).toEqual({ ok: true })

    expect(set).toHaveBeenCalledWith("rate:egp", "50")
    expect(set).toHaveBeenCalledWith("coin:index_cap_bps", "250")
    expect(set).not.toHaveBeenCalledWith("markup:base:mlbb", expect.anything())
    expect(set).not.toHaveBeenCalledWith("markup:reseller:mlbb", expect.anything())
    expect(set).not.toHaveBeenCalledWith("markup:topup_client:mlbb", expect.anything())
  })

  it("saves a valid decimal p2p rate as minor integer string", async () => {
    const set = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
    })

    expect(
      await saveSettings(container, {
        egpRate: 48.5,
        coinIndexCapBps: 500,
        p2pRateEgp: "48.75",
      }),
    ).toEqual({ ok: true })

    expect(set).toHaveBeenCalledWith(P2P_RATE_MANUAL_KEY, "4875")
  })

  it("saves empty p2p rate as empty string", async () => {
    const set = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
    })

    expect(
      await saveSettings(container, {
        egpRate: 48.5,
        coinIndexCapBps: 500,
        p2pRateEgp: "",
      }),
    ).toEqual({ ok: true })

    expect(set).toHaveBeenCalledWith(P2P_RATE_MANUAL_KEY, "")
  })

  it("rejects invalid p2p rates", async () => {
    expect(
      await saveSettings(fakeContainer(), {
        egpRate: 48.5,
        coinIndexCapBps: 500,
        p2pRateEgp: "-1",
      }),
    ).toEqual({ ok: false, error: "invalid" })

    expect(
      await saveSettings(fakeContainer(), {
        egpRate: 48.5,
        coinIndexCapBps: 500,
        p2pRateEgp: "48.755",
      }),
    ).toEqual({ ok: false, error: "invalid" })

    expect(
      await saveSettings(fakeContainer(), {
        egpRate: 48.5,
        coinIndexCapBps: 500,
        p2pRateEgp: "abc",
      }),
    ).toEqual({ ok: false, error: "invalid" })
  })
})

describe("saveP2pSettings", () => {
  it("writes window, interval, and sigma keys", async () => {
    const set = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
    })
    expect(await saveP2pSettings(container, { windowHours: 168, syncIntervalSeconds: 10_800, outlierSigma: 3 })).toEqual({ ok: true })
    expect(set).toHaveBeenCalledWith("rate:usdt:p2p:window_hours", "168")
    expect(set).toHaveBeenCalledWith("rate:usdt:p2p:sync_interval_seconds", "10800")
    expect(set).toHaveBeenCalledWith("p2p:outlier_sigma", "3")
  })

  it("rejects out-of-range values", async () => {
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 0, syncIntervalSeconds: 10_800, outlierSigma: 2 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 721, syncIntervalSeconds: 10_800, outlierSigma: 2 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 1.5, syncIntervalSeconds: 10_800, outlierSigma: 2 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 24, syncIntervalSeconds: 299, outlierSigma: 2 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 24, syncIntervalSeconds: 10_801, outlierSigma: 2 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 0 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 6 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveP2pSettings(fakeContainer(), { windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 2.5 })).toEqual({
      ok: false,
      error: "invalid",
    })
  })
})

describe("saveVipLevels", () => {
  it("persists a valid 3-level set with basisPoints rounded from percent", async () => {
    const set = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
    })

    expect(
      await saveVipLevels(container, {
        levels: [
          { key: "epic", coins: 0, percent: 20, title: "Epic", icon: "shield", color: "sky" },
          { key: "mythic", coins: 1000, percent: 15, title: "Mythic", icon: "gem", color: "gold" },
          { key: "immortal", coins: 5000, percent: 10, title: "Immortal", icon: "flame", color: "ember" },
        ],
      }),
    ).toEqual({ ok: true })

    expect(set).toHaveBeenCalledWith(
      "markup:vip:mlbb",
      JSON.stringify({
        levels: [
          { key: "epic", coins: 0, basisPoints: 2000, title: "Epic", icon: "shield", color: "sky" },
          { key: "mythic", coins: 1000, basisPoints: 1500, title: "Mythic", icon: "gem", color: "gold" },
          { key: "immortal", coins: 5000, basisPoints: 1000, title: "Immortal", icon: "flame", color: "ember" },
        ],
      }),
    )
  })

  it("accepts numeric strings for coins and percent", async () => {
    const set = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
    })

    expect(
      await saveVipLevels(container, {
        levels: [
          { key: "epic", coins: "0", percent: "20", title: "Epic", icon: "shield", color: "sky" },
          { key: "mythic", coins: "1000", percent: "15.5", title: "Mythic", icon: "gem", color: "gold" },
          { key: "immortal", coins: "5000", percent: "10", title: "Immortal", icon: "flame", color: "ember" },
        ],
      }),
    ).toEqual({ ok: true })

    expect(set).toHaveBeenCalledWith(
      "markup:vip:mlbb",
      JSON.stringify({
        levels: [
          { key: "epic", coins: 0, basisPoints: 2000, title: "Epic", icon: "shield", color: "sky" },
          { key: "mythic", coins: 1000, basisPoints: 1550, title: "Mythic", icon: "gem", color: "gold" },
          { key: "immortal", coins: 5000, basisPoints: 1000, title: "Immortal", icon: "flame", color: "ember" },
        ],
      }),
    )
  })

  it("rejects each invalid shape with the Arabic error and writes nothing", async () => {
    const invalid = { ok: false, error: "مستويات VIP مش صالحة" }

    const expectInvalid = async (levels: unknown[]) => {
      const set = vi.fn(async () => {})
      const container = fakeContainer({
        settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
      })
      await expect(saveVipLevels(container, { levels })).resolves.toEqual(invalid)
      expect(set).not.toHaveBeenCalled()
    }

    // fewer than 2 levels
    await expectInvalid([])
    await expectInvalid([
      { key: "epic", coins: 0, percent: 20, title: "Epic", icon: "shield", color: "sky" },
    ])

    // duplicate keys
    await expectInvalid([
      { key: "epic", coins: 0, percent: 20, title: "Epic", icon: "shield", color: "sky" },
      { key: "epic", coins: 1000, percent: 10, title: "Copy", icon: "gem", color: "gold" },
    ])

    // first coins != 0
    await expectInvalid([
      { key: "epic", coins: 100, percent: 20, title: "Epic", icon: "shield", color: "sky" },
      { key: "mythic", coins: 1000, percent: 10, title: "Mythic", icon: "gem", color: "gold" },
    ])

    // increasing margins (basisPoints must not increase)
    await expectInvalid([
      { key: "epic", coins: 0, percent: 10, title: "Epic", icon: "shield", color: "sky" },
      { key: "mythic", coins: 1000, percent: 20, title: "Mythic", icon: "gem", color: "gold" },
    ])

    // unknown icon
    await expectInvalid([
      { key: "epic", coins: 0, percent: 20, title: "Epic", icon: "unknown", color: "sky" },
      { key: "mythic", coins: 1000, percent: 10, title: "Mythic", icon: "gem", color: "gold" },
    ])

    // unknown colour
    await expectInvalid([
      { key: "epic", coins: 0, percent: 20, title: "Epic", icon: "shield", color: "pink" },
      { key: "mythic", coins: 1000, percent: 10, title: "Mythic", icon: "gem", color: "gold" },
    ])

    // non-numeric coins
    await expectInvalid([
      { key: "epic", coins: "abc", percent: 20, title: "Epic", icon: "shield", color: "sky" },
      { key: "mythic", coins: 1000, percent: 10, title: "Mythic", icon: "gem", color: "gold" },
    ])

    // non-numeric percent
    await expectInvalid([
      { key: "epic", coins: 0, percent: "abc", title: "Epic", icon: "shield", color: "sky" },
      { key: "mythic", coins: 1000, percent: 10, title: "Mythic", icon: "gem", color: "gold" },
    ])
  })
})

describe("adjustWallet", () => {
  it("credits a wallet", async () => {
    const credit = vi.fn(async () => ({ clientId: "c1", coinBalance: 10 }))
    const container = fakeContainer({
      wallets: {
        credit,
        debit: async () => true,
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
        listEntries: async () => [],
      },
    })

    const outcome = await adjustWallet(container, {
      clientId: "c1",
      accountId: "a1",
      amount: 10,
      direction: "credit",
      reason: "gift",
    })

    expect(outcome).toEqual({ ok: true, accountId: "a1" })
    expect(credit).toHaveBeenCalledWith("c1", 10, "gift")
  })

  it("reports insufficient funds on debit", async () => {
    const container = fakeContainer({
      wallets: {
        credit: async () => ({ clientId: "c1", coinBalance: 0 }),
        debit: async () => false,
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 0 }),
        listEntries: async () => [],
      },
    })

    expect(
      await adjustWallet(container, {
        clientId: "c1",
        accountId: "a1",
        amount: 10,
        direction: "debit",
        reason: "spend",
      }),
    ).toEqual({ ok: false, error: "insufficient", accountId: "a1" })
  })

  it("rejects an invalid direction and a non-positive amount", async () => {
    expect(
      await adjustWallet(fakeContainer(), { clientId: "c1", accountId: "a1", amount: 1, direction: "give", reason: "x" }),
    ).toEqual({ ok: false, error: "invalid", accountId: "a1" })

    expect(
      await adjustWallet(fakeContainer(), { clientId: "c1", accountId: "a1", amount: 0, direction: "credit", reason: "x" }),
    ).toEqual({ ok: false, error: "amount", accountId: "a1" })
  })
})

describe("searchOrders", () => {
  it("maps the repository rows to DTOs", async () => {
    const page = await searchOrders(fakeContainer(), {
      status: null,
      from: null,
      to: null,
      q: null,
      skip: 0,
      take: 50,
    })

    expect(page.total).toBe(1)
    expect(page.rows[0]).toEqual({
      id: "o1",
      token: "t1",
      clientId: "c1",
      productName: "86",
      player: { userId: "1", serverId: "2" },
      price: money(1200, "USD"),
      discountMinor: null,
      costMinor: null,
      status: "PAID",
      createdAt: "2026-01-01T00:00:00.000Z",
    })
  })
})

describe("readAdminStats", () => {
  it("reads P2P from the persisted last-known price without calling p2pRate.read", async () => {
    const fetchedAt = "2024-06-01T12:00:00.000Z"
    const readP2p = vi.fn(async () => {
      throw new Error("should not read")
    })
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 90000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      p2pRate: { read: readP2p },
      treasury: {
        snapshot: async () => ({ usdtMinor: 70000, basisEgpMinor: 0, wacEgpMinor: 5100 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),
        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 10 },
      settings: {
        get: async (key: string) => (key === P2P_RATE_LAST_KEY ? JSON.stringify({ minor: 5200, at: fetchedAt }) : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })

    const stats = await readAdminStats(container)

    expect(stats.p2pEgpPerUsdtMinor).toBe(5200)
    expect(readP2p).not.toHaveBeenCalled()
  })

  it("uses available USDT while keeping live balance displayed", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 90000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p",
          fetchedAt: "2024-06-01T12:00:00.000Z",
          stale: false,
        }),
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 70000, basisEgpMinor: 0, wacEgpMinor: 5100 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 10 },
      settings: { get: async () => "true", set: async () => {}, delete: async () => {}, all: async () => ({}) },
    })

    const stats = await readAdminStats(container)

    expect(stats.balanceUsdtMinor).toBe(90000)
    expect(stats.p2pEgpPerUsdtMinor).toBe(5200)
    expect(stats.wacEgpMinor).toBe(5100)
    expect(stats.availableUsdtMinor).toBe(69990)
    expect(stats.balanceError).toBe(false)
    expect(stats.updatedAt).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(stats.updatedAt))).toBe(false)
  })

  it("live balance failure keeps display fields null/error but available USDT uses recorded funds", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => {
          throw new Error("offline")
        },
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p",
          fetchedAt: "2024-06-01T12:00:00.000Z",
          stale: false,
        }),
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 70000, basisEgpMinor: 0, wacEgpMinor: 5100 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 10 },
    })

    const stats = await readAdminStats(container)

    expect(stats.balanceUsdtMinor).toBeNull()
    expect(stats.balanceError).toBe(true)
    expect(stats.availableUsdtMinor).toBe(69990)
    expect(stats.p2pEgpPerUsdtMinor).toBe(5200)
    expect(stats.wacEgpMinor).toBe(5100)
  })

  it("p2p failure degrades to null without failing available USDT", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 90000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      p2pRate: {
        read: async () => {
          throw new Error("p2p down")
        },
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 70000, basisEgpMinor: 0, wacEgpMinor: 5100 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 0 },
      settings: { get: async () => "true", set: async () => {}, delete: async () => {}, all: async () => ({}) },
    })

    const stats = await readAdminStats(container)

    expect(stats.balanceUsdtMinor).toBe(90000)
    expect(stats.p2pEgpPerUsdtMinor).toBeNull()
    expect(stats.wacEgpMinor).toBe(5100)
    expect(stats.availableUsdtMinor).toBe(70000)
    expect(stats.balanceError).toBe(false)
  })

  it("treasury snapshot failure degrades to null", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 70000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p",
          fetchedAt: "2024-06-01T12:00:00.000Z",
          stale: false,
        }),
      },
      treasury: {
        snapshot: async () => { throw new Error("wac down") },
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 0 },
      settings: { get: async () => "true", set: async () => {}, delete: async () => {}, all: async () => ({}) },
    })

    const stats = await readAdminStats(container)

    expect(stats.balanceUsdtMinor).toBe(70000)
    expect(stats.p2pEgpPerUsdtMinor).toBe(5200)
    expect(stats.wacEgpMinor).toBeNull()
    expect(stats.availableUsdtMinor).toBeNull()
    expect(stats.balanceError).toBe(false)
  })
})

describe("listProducts", () => {
  it("maps products with available USDT: affordable, shortfall gap, inactive, unknown snapshot", async () => {
    const result = await listProducts(
      fakeContainer({
        products: {
          listActive: async () => [],
          listAll: async () => [
            product({ id: "aff", distributorId: "d1", name: "affordable", cost: money(100, "USD"), game: "mlbb", active: true }),
            product({ id: "short", distributorId: "d2", name: "shortfall", cost: money(250, "USD"), game: "mlbb", active: true }),
            product({ id: "off", distributorId: "d3", name: "inactive", cost: money(50, "USD"), game: "mlbb", active: false }),
          ],
          upsertMany: async () => {},
          deactivateExcept: async () => 0,
          appendCostHistory: async () => {},
        },
        treasury: {
          snapshot: async () => ({ usdtMinor: 100, basisEgpMinor: 0, wacEgpMinor: 0 }),
          recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

          consumeForOrder: async () => { throw new Error("unused") },
          reconcile: async () => { throw new Error("unused") },
        } as any,
      }),
    )

    expect(result.products).toEqual([
      {
        id: "aff",
        name: "affordable",
        cost: money(100, "USD"),
        active: true,
        syncedAt: null,
        buyable: true,
        fundingGapMinor: 0,
        unavailableReason: null,
      },
      {
        id: "short",
        name: "shortfall",
        cost: money(250, "USD"),
        active: true,
        syncedAt: null,
        buyable: false,
        fundingGapMinor: 150,
        unavailableReason: "insufficient_funds",
      },
      {
        id: "off",
        name: "inactive",
        cost: money(50, "USD"),
        active: false,
        syncedAt: null,
        buyable: false,
        fundingGapMinor: 0,
        unavailableReason: "inactive",
      },
    ])
  })

  it("marks all products unknown when treasury snapshot is unavailable", async () => {
    const result = await listProducts(
      fakeContainer({
        products: {
          listActive: async () => [],
          listAll: async () => [
            product({ id: "p1", distributorId: "d1", name: "cheap", cost: money(50, "USD"), game: "mlbb", active: true }),
          ],
          upsertMany: async () => {},
          deactivateExcept: async () => 0,
          appendCostHistory: async () => {},
        },
        treasury: {
          snapshot: async () => { throw new Error("offline") },
          recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

          consumeForOrder: async () => { throw new Error("unused") },
          reconcile: async () => { throw new Error("unused") },
        } as any,
      }),
    )

    expect(result.products).toEqual([
      {
        id: "p1",
        name: "cheap",
        cost: money(50, "USD"),
        active: true,
        syncedAt: null,
        buyable: false,
        fundingGapMinor: 0,
        unavailableReason: "unknown_balance",
      },
    ])
  })
})

describe("readDashboard", () => {
  it("computes the live balance display and uses available USDT", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 100000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 70000, basisEgpMinor: 0, wacEgpMinor: 0 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 10 },
    })

    const dashboard = await readDashboard(container)

    expect(dashboard.balance).toEqual({ usdMinor: 100000, egpMinor: 4850000 })
    expect(dashboard.balanceError).toBe(false)
    expect(dashboard.unfulfillableCount).toBe(1)
    expect(dashboard.showWarning).toBe(false)
    expect(dashboard.treasury.availableUsdtMinor).toBe(69990)
    expect(dashboard.treasury.recordedUsdtMinor).toBe(70000)
    expect(dashboard.treasury.freeUsdtMinor).toBe(30000)
    expect(dashboard.pricing.baseMarkupBasisPoints).toBe(2000)
    expect(dashboard.pricing.vipCurve).toEqual([
      { coins: 0, basisPoints: 2000 },
      { coins: 1000, basisPoints: 1500 },
      { coins: 5000, basisPoints: 1000 },
    ])
  })

  it("reports a balance read failure", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => {
          throw new Error("offline")
        },
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
    })

    const dashboard = await readDashboard(container)
    expect(dashboard.balance).toBeNull()
    expect(dashboard.balanceError).toBe(true)
    expect(dashboard.balanceAt).toBeNull()
    expect(dashboard.treasury.recordedUsdtMinor).toBe(0)
    expect(dashboard.treasury.freeUsdtMinor).toBe(0)
    expect(dashboard.treasury.availableUsdtMinor).toBe(0)
  })

  it("uses available USDT even when live balance fetch fails", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => {
          throw new Error("offline")
        },
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 4000, basisEgpMinor: 0, wacEgpMinor: 0 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 50 },
    })

    const dashboard = await readDashboard(container)

    expect(dashboard.balance).toBeNull()
    expect(dashboard.balanceError).toBe(true)
    expect(dashboard.treasury.availableUsdtMinor).toBe(3950)
    expect(dashboard.treasury.availableCoins).toBe(3950)
    expect(dashboard.treasury.recordedUsdtMinor).toBe(4000)
    expect(dashboard.treasury.freeUsdtMinor).toBe(0)
  })

  it("pending does not affect free or available in the dashboard", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 100000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 70000, basisEgpMinor: 0, wacEgpMinor: 0 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
    })

    const dashboard = await readDashboard(container)
    expect(dashboard.treasury.recordedUsdtMinor).toBe(70000)
    expect(dashboard.treasury.freeUsdtMinor).toBe(30000)
    expect(dashboard.treasury.availableUsdtMinor).toBe(70000)
  })

  it("reads persisted P2P for the dashboard without calling p2pRate.read or appending history", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"))
    try {
      const fetchedAt = "2024-06-01T11:59:00.000Z"
      const day = fetchedAt.slice(0, 10)
      const hour = `${day}T${fetchedAt.slice(11, 13)}:00:00.000Z`
      const readP2p = vi.fn(async () => {
        throw new Error("should not read")
      })
      const set = vi.fn(async () => {})
      const container = fakeContainer({
        p2pRate: { read: readP2p },
        settings: {
          get: async (key: string) => {
            if (key === P2P_RATE_LAST_KEY) return JSON.stringify({ minor: 5200, at: fetchedAt })
            if (key === P2P_RATE_HISTORY_KEY) {
              return JSON.stringify([
                { day, hour, egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 10, priceSumMinor: 50700, lastObservedAt: fetchedAt },
              ])
            }
            return null
          },
          set,
          delete: async () => {},
          all: async () => ({}),
        },
      })

      const dashboard = await readDashboard(container)
      expect(dashboard.p2p).toEqual({
        egpPerUsdtMinor: 5200,
        source: "binance-p2p",
        fetchedAt,
        stale: false,
        bankTransferEgpPerUsdtMinor: null,
        vodafoneEgpPerUsdtMinor: null,
        range: {
          minEgpPerUsdtMinor: 4800,
          avgEgpPerUsdtMinor: 5070,
          maxEgpPerUsdtMinor: 5400,
          adCount: 10,
          stdDevEgpPerUsdtMinor: null,
          outlierCount: 0,
        },
      })
      expect(readP2p).not.toHaveBeenCalled()
      expect(set).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it("marks persisted P2P stale when last-known is older than 2x the sync interval", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"))
    try {
      const container = fakeContainer({
        p2pRate: {
          read: vi.fn(async () => {
            throw new Error("should not read")
          }),
        },
        settings: {
          get: async (key: string) => {
            if (key === P2P_RATE_LAST_KEY) return JSON.stringify({ minor: 5200, at: "2024-06-01T11:48:00.000Z" })
            if (key === "rate:usdt:p2p:sync_interval_seconds") return "300"
            return null
          },
          set: async () => {},
          delete: async () => {},
          all: async () => ({}),
        },
      })

      const dashboard = await readDashboard(container)
      expect(dashboard.p2p?.stale).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it("maps per-method P2P fields from the rate reader", async () => {
    const fetchedAt = new Date().toISOString()
    const day = fetchedAt.slice(0, 10)
    const hour = `${day}T${fetchedAt.slice(11, 13)}:00:00.000Z`
    const container = fakeContainer({
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p",
          fetchedAt,
          stale: false,
          bankTransferEgpPerUsdtMinor: 5200,
          vodafoneEgpPerUsdtMinor: 4900,
          range: { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, adCount: 10 },
        }),
      },
      settings: {
        get: async (key: string) => {
          if (key === P2P_RATE_HISTORY_KEY) {
            return JSON.stringify([
              { day, hour, egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 10, priceSumMinor: 50700, lastObservedAt: fetchedAt },
            ])
          }
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })

    const dashboard = await readDashboard(container)
    expect(dashboard.p2p).toEqual({
      egpPerUsdtMinor: 5200,
      source: "binance-p2p",
      fetchedAt,
      stale: false,
      bankTransferEgpPerUsdtMinor: 5200,
      vodafoneEgpPerUsdtMinor: 4900,
      range: {
        minEgpPerUsdtMinor: 4800,
        avgEgpPerUsdtMinor: 5070,
        maxEgpPerUsdtMinor: 5400,
        adCount: 10,
        stdDevEgpPerUsdtMinor: null,
        outlierCount: 0,
      },
    })
  })

  it("dashboard p2p.range aggregates the configured window, not the single quote", async () => {
    const nowMs = Date.now()
    const t1 = new Date(nowMs - 36 * 3600000).toISOString()
    const t2 = new Date(nowMs - 3600000).toISOString()
    const hourOf = (iso: string) => `${iso.slice(0, 10)}T${iso.slice(11, 13)}:00:00.000Z`
    const twoDayHistory = JSON.stringify([
      { day: t1.slice(0, 10), hour: hourOf(t1), egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 2, priceSumMinor: 9800, lastObservedAt: t1 },
      { day: t2.slice(0, 10), hour: hourOf(t2), egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5300, offerCount: 2, priceSumMinor: 10000, lastObservedAt: t2 },
    ])
    const fetchedAt = new Date().toISOString()
    const container = fakeContainer({
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p" as const,
          fetchedAt,
          stale: false,
          bankTransferEgpPerUsdtMinor: 5200,
          vodafoneEgpPerUsdtMinor: 5100,
          range: { minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5300, adCount: 2 },
        }),
      },
      settings: {
        get: async (key: string) => {
          if (key === P2P_RATE_HISTORY_KEY) return twoDayHistory
          if (key === "rate:usdt:p2p:window_hours") return "48"
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    const dashboard = await readDashboard(container)
    // window 48h: min 4800, max 5300, count 4, sum 19800, avg 4950
    expect(dashboard.p2p?.range).toEqual({
      minEgpPerUsdtMinor: 4800,
      avgEgpPerUsdtMinor: 4950,
      maxEgpPerUsdtMinor: 5300,
      adCount: 4,
      stdDevEgpPerUsdtMinor: null,
      outlierCount: 0,
    })
  })

  it("dashboard persists the current live P2P point immediately with hour in history", async () => {
    const store: Record<string, string> = {}
    const fetchedAt = new Date().toISOString()
    const day = fetchedAt.slice(0, 10)
    const hour = `${day}T${fetchedAt.slice(11, 13)}:00:00.000Z`
    const container = fakeContainer({
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p" as const,
          fetchedAt,
          stale: false,
          bankTransferEgpPerUsdtMinor: 5200,
          vodafoneEgpPerUsdtMinor: 4900,
          range: { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, adCount: 10, priceSumMinor: 50700, stdDevEgpPerUsdtMinor: 190, outlierCount: 2 },
        }),
      },
      settings: {
        get: async (key: string) => (key in store ? store[key] : null),
        set: async (key: string, value: string) => { store[key] = value },
        delete: async (key: string) => { delete store[key] },
        all: async () => ({ ...store }),
      },
    })
    const dashboard = await readDashboard(container)
    expect(dashboard.history.p2p).toEqual([
      { day, hour, egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400 },
    ])
    expect(dashboard.p2p?.range).toEqual({
      minEgpPerUsdtMinor: 4800,
      avgEgpPerUsdtMinor: 5070,
      maxEgpPerUsdtMinor: 5400,
      adCount: 10,
      stdDevEgpPerUsdtMinor: 190,
      outlierCount: 2,
    })
    const persisted = JSON.parse(store[P2P_RATE_HISTORY_KEY])
    expect(persisted[0].hour).toBe(hour)
    expect(persisted[0].day).toBe(day)
    expect(persisted[0].offerCount).toBe(10)
    expect(persisted[0].priceSumMinor).toBe(50700)
    expect(persisted[0].stdDevEgpPerUsdtMinor).toBe(190)
    expect(persisted[0].outlierCount).toBe(2)
  })

  it("dashboard exposes p2pSettings with defaults and configured values", async () => {
    const defaults = await readDashboard(fakeContainer())
    expect(defaults.p2pSettings).toEqual({
      windowHours: 24,
      minWindowHours: 1,
      maxWindowHours: 720,
      syncIntervalSeconds: 300,
      minSyncIntervalSeconds: 300,
      maxSyncIntervalSeconds: 10_800,
      recommendedSyncIntervalSeconds: 300,
      outlierSigma: 2,
      minOutlierSigma: 1,
      maxOutlierSigma: 5,
    })

    const configured = await readDashboard(
      fakeContainer({
        settings: {
          get: async (key: string) => {
            if (key === "rate:usdt:p2p:window_hours") return "168"
            if (key === "rate:usdt:p2p:sync_interval_seconds") return "600"
            if (key === "p2p:outlier_sigma") return "4"
            return null
          },
          set: async () => {},
          delete: async () => {},
          all: async () => ({}),
        },
      }),
    )
    expect(configured.p2pSettings).toEqual({
      windowHours: 168,
      minWindowHours: 1,
      maxWindowHours: 720,
      syncIntervalSeconds: 600,
      minSyncIntervalSeconds: 300,
      maxSyncIntervalSeconds: 10_800,
      recommendedSyncIntervalSeconds: 300,
      outlierSigma: 4,
      minOutlierSigma: 1,
      maxOutlierSigma: 5,
    })
  })

  it("maps treasury coin index and average coin funding cost fields", async () => {
    const container = fakeContainer({
      deposits: {
        append: async () => {},
        list: async () => [],
        listByClient: async () => [],
        listRecent: async () => [],
        listSince: async () => [],
        coinWacEgpMinor: async () => 1234,
      },
    })
    const dashboard = await readDashboard(container)
    expect(dashboard.treasury.averageCoinFundingCostEgpMinor).toBe(1234)
    expect(dashboard.treasury.coinIndex).toBe(1)
    expect(dashboard.treasury.coinValueUsdMinor).toBe(1)
    expect(dashboard.treasury.coinIndexCapBps).toBe(500)
    expect(dashboard.treasury.coinIndexUpdatedAt).toBeNull()
    expect(dashboard.treasury.coinIndexLastMoveBps).toBeNull()
    expect(dashboard.treasury.coinIndexCapped).toBe(false)
  })

  it("maps coin index last move and capped from coin:index_last_run", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) =>
          key === "coin:index_last_run"
            ? JSON.stringify({
                fromIndexMicro: 1_000_000,
                toIndexMicro: 1_050_000,
                meanRatioBps: 10_500,
                capped: true,
                products: 3,
                at: "2024-06-01T00:00:00.000Z",
              })
            : null,
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })
    const dashboard = await readDashboard(container)
    expect(dashboard.treasury.coinIndexLastMoveBps).toBe(500)
    expect(dashboard.treasury.coinIndexCapped).toBe(true)
  })

  it("returns history.p2p and history.wac from fakes", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) =>
          key === P2P_RATE_HISTORY_KEY
            ? JSON.stringify([{ day: "2024-06-01", egpPerUsdtMinor: 4875 }])
            : null,
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      orderReport: {
        summarySince: async () => ({ deliveredCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0 }),
        dailySeriesSince: async () => [],
        wacSeriesSince: async () => [{ day: "2024-06-01", wacEgpMinor: 5000 }],
        clientSummarySince: async () => [],
      },
    })
    const dashboard = await readDashboard(container)
    expect(dashboard.history.p2p).toEqual([{ day: "2024-06-01", hour: null, egpPerUsdtMinor: 4875 }])
    expect(dashboard.history.wac).toEqual([{ day: "2024-06-01", wacEgpMinor: 5000 }])
  })

  it("returns history.p2p range through to the dashboard", async () => {
    const container = fakeContainer({
      settings: {
        get: async (key: string) =>
          key === P2P_RATE_HISTORY_KEY
            ? JSON.stringify([
                { day: "2024-06-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400 },
                { day: "2024-06-02", egpPerUsdtMinor: 4875 },
              ])
            : null,
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
      orderReport: {
        summarySince: async () => ({ deliveredCount: 0, revenueUsdMinor: 0, marginUsdMinor: 0 }),
        dailySeriesSince: async () => [],
        wacSeriesSince: async () => [],
        clientSummarySince: async () => [],
      },
    })
    const dashboard = await readDashboard(container)
    expect(dashboard.history.p2p).toEqual([
      { day: "2024-06-01", hour: null, egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400 },
      { day: "2024-06-02", hour: null, egpPerUsdtMinor: 4875 },
    ])
  })

  it("summary.series spans 90 days", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-06-30T12:00:00.000Z"))
    try {
      const container = fakeContainer()
      const dashboard = await readDashboard(container)
      expect(dashboard.summary.series).toHaveLength(90)
      expect(dashboard.summary.series[0].day).toBe("2024-04-02")
      expect(dashboard.summary.series[89].day).toBe("2024-06-30")
    } finally {
      vi.useRealTimers()
    }
  })

  it("exposes operations.mode from a settings fake seeded with operations:mode and liveReady", async () => {
    const settings = {
      get: async (key: string) => (key === "operations:mode" ? "live" : null),
      set: async () => {},
      delete: async () => {},
      all: async () => ({}),
    }
    const container = fakeContainer({
      settings,
      operationsMode: () => readOperationsMode(settings, "sandbox"),
      liveReady: true,
    })

    const dashboard = await readDashboard(container)
    expect(dashboard.operations).toEqual({ mode: "live", liveReady: true })

    const defaulted = await readDashboard(fakeContainer())
    expect(defaulted.operations).toEqual({ mode: "sandbox", liveReady: false })
  })

  it("computes projections with known sums", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 70000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 70000, basisEgpMinor: 0, wacEgpMinor: 0 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),

        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 10 },
      consumptions: {
        append: async () => {},
        totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }),
        findByOrder: async () => null,
        sumUsdtSince: async () => 1400,
        listRecent: async () => [],
      },
      orders: {
        listRecent: async () => [placed],
        search: async () => ({ rows: [placed], total: 1 }),
        save: async () => {},
        findById: async () => placed,
        findByToken: async () => placed,
        update: async () => {},
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        sumCoinsChargedSince: async () => 70,
      },
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p",
          fetchedAt: "2024-06-01T12:00:00.000Z",
          stale: false,
          bankTransferEgpPerUsdtMinor: 5200,
          vodafoneEgpPerUsdtMinor: 4900,
        }),
      },
      settings: { get: async () => "true", set: async () => {}, delete: async () => {}, all: async () => ({}) },
    })
    const dashboard = await readDashboard(container)
    // available = 70000 - 10*1 = 69990; avgDailyConsumption = 1400/7 = 200; runway = floor(69990/200)=349
    expect(dashboard.projections.treasuryRunwayDays).toBe(349)
    // availableCoins = 69990; avgDailyCoins = 70/7 = 10; runway = floor(69990/10)=6999
    expect(dashboard.projections.coinRunwayDays).toBe(6999)
    // availableUsdtEgpMinor = floor((69990 * 5200) / 100) = 3639480
    expect(dashboard.projections.availableUsdtEgpMinor).toBe(3639480)
  })

  it("projections when balance fails: availableUsdtEgpMinor null, availableCoins 0", async () => {
    const container = fakeContainer({
      distributor: {
        getBalance: async () => {
          throw new Error("offline")
        },
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      coinSupply: { totalCoins: async () => 50 },
      consumptions: {
        append: async () => {},
        totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }),
        findByOrder: async () => null,
        sumUsdtSince: async () => 700,
        listRecent: async () => [],
      },
      orders: {
        listRecent: async () => [placed],
        search: async () => ({ rows: [placed], total: 1 }),
        save: async () => {},
        findById: async () => placed,
        findByToken: async () => placed,
        update: async () => {},
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        sumCoinsChargedSince: async () => 70,
      },
      p2pRate: {
        read: async () => ({
          egpPerUsdtMinor: 5200,
          source: "binance-p2p",
          fetchedAt: "2024-06-01T12:00:00.000Z",
          stale: false,
        }),
      },
      settings: { get: async () => "true", set: async () => {}, delete: async () => {}, all: async () => ({}) },
    })
    const dashboard = await readDashboard(container)
    expect(dashboard.projections.availableUsdtEgpMinor).toBeNull()
    expect(dashboard.treasury.availableCoins).toBe(0)
  })
})

describe("users", () => {
  it("lists accounts", async () => {
    const container = fakeContainer({
      accounts: {
        list: async () => ({
          rows: [{ id: "a1", clientId: "c1", email: "a@b.c", coinBalance: 5, createdAt: "2026" }],
          total: 1,
        }),
        findById: async () => null,
        findByEmail: async () => null,
        create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
        listPreferences: async () => ({}),
        setPreference: async () => {},
      },
    })

    const page = await listUsers(container, 0, 20)
    expect(page.rows[0].email).toBe("a@b.c")
    expect(page.rows[0].coinBalance).toBe(5)
    expect("clientType" in page.rows[0]).toBe(false)
  })

  it("reads a user with wallet, entries, and base VIP fields", async () => {
    const container = fakeContainer({
      accounts: {
        list: async () => ({ rows: [], total: 0 }),
        findById: async () => ({ id: "a1", clientId: "c1", email: "a@b.c", passwordHash: "" }),
        findByEmail: async () => null,
        create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
        listPreferences: async () => ({}),
        setPreference: async () => {},
      },
      wallets: {
        credit: async () => ({ clientId: "c1", coinBalance: 0 }),
        debit: async () => true,
        getOrCreate: async () => ({ clientId: "c1", coinBalance: 42 }),
        listEntries: async () => [{ id: "e1", amount: 2, reason: "gift", createdAt: "2026" }],
      },
      activity: { sumQualifiedVolumeSince: async (clientId: string) => (clientId === "c1" ? 1200 : 0) },
      orders: {
        listRecent: async () => [placed],
        search: async () => ({ rows: [placed], total: 1 }),
        save: async () => {},
        findById: async () => placed,
        findByToken: async () => placed,
        update: async () => {},
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        sumCoinsChargedSince: async () => 0,
      },
    })

    const user = await readUser(container, "a1")
    expect(user?.account.email).toBe("a@b.c")
    expect("clientType" in (user ?? {})).toBe(false)
    expect(user?.wallet.coinBalance).toBe(42)
    expect(user?.entries[0].createdAt).toBe("2026")
    expect(user?.coinsConsumed30d).toBe(1200)
    expect(user?.markupBasisPoints).toBe(
      resolveMarkupBasisPoints(levelsToCurve(defaultLevelsFor(2000)), 1200),
    )
    expect(user?.nextBreakpoint).toEqual({ coins: 5000, basisPoints: 1000 })
    expect(user?.override).toBeNull()
  })

  it("reads VIP fields from the MLBB curve", async () => {
    const curve = JSON.stringify({
      breakpoints: [
        { coins: 0, basisPoints: 2000 },
        { coins: 10000, basisPoints: 1000 },
      ],
    })
    const container = fakeContainer({
      accounts: {
        list: async () => ({ rows: [], total: 0 }),
        findById: async () => ({ id: "a1", clientId: "c1", email: "a@b.c", passwordHash: "" }),
        findByEmail: async () => null,
        create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
        listPreferences: async () => ({}),
        setPreference: async () => {},
      },
      activity: { sumQualifiedVolumeSince: async () => 5000 },
      orders: {
        listRecent: async () => [placed],
        search: async () => ({ rows: [placed], total: 1 }),
        save: async () => {},
        findById: async () => placed,
        findByToken: async () => placed,
        update: async () => {},
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        sumCoinsChargedSince: async () => 0,
      },
      settings: {
        get: async (key: string) => (key === "markup:vip:mlbb" ? curve : null),
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })

    const user = await readUser(container, "a1")
    expect(user?.coinsConsumed30d).toBe(5000)
    expect(user?.markupBasisPoints).toBe(1500)
    expect(user?.nextBreakpoint).toEqual({ coins: 10000, basisPoints: 1000 })
    expect(user?.override).toBeNull()
  })

  it("reads an active markup override", async () => {
    const curve = JSON.stringify({
      breakpoints: [
        { coins: 0, basisPoints: 2000 },
        { coins: 10000, basisPoints: 1000 },
      ],
    })
    const override = JSON.stringify({ basisPoints: 700, note: "VIP", updatedAt: "2026-01-02T00:00:00.000Z" })
    const container = fakeContainer({
      accounts: {
        list: async () => ({ rows: [], total: 0 }),
        findById: async () => ({ id: "a1", clientId: "c1", email: "a@b.c", passwordHash: "" }),
        findByEmail: async () => null,
        create: async () => ({ id: "", clientId: "", email: "", passwordHash: "" }),
        listPreferences: async () => ({}),
        setPreference: async () => {},
      },
      activity: { sumQualifiedVolumeSince: async () => 5000 },
      orders: {
        listRecent: async () => [placed],
        search: async () => ({ rows: [placed], total: 1 }),
        save: async () => {},
        findById: async () => placed,
        findByToken: async () => placed,
        update: async () => {},
        listByClient: async () => [],
        findByDistributorOrderId: async () => null,
        listByStatus: async () => [],
        sumCoinsChargedSince: async () => 0,
      },
      settings: {
        get: async (key: string) => {
          if (key === "markup:vip:mlbb") return curve
          if (key === "markup:override:c1") return override
          return null
        },
        set: async () => {},
        delete: async () => {},
        all: async () => ({}),
      },
    })

    const user = await readUser(container, "a1")
    expect(user?.markupBasisPoints).toBe(700)
    expect(user?.nextBreakpoint).toEqual({ coins: 10000, basisPoints: 1000 })
    expect(user?.override).toEqual({ basisPoints: 700, note: "VIP", updatedAt: "2026-01-02T00:00:00.000Z" })
  })

  it("returns null for an unknown user", async () => {
    expect(await readUser(fakeContainer(), "missing")).toBeNull()
  })
})

describe("recordDeposit", () => {
  it("maps a successful deposit outcome", async () => {
    const recordDepositFn = vi.fn(async () => ({
      ok: true as const,
      deposit: {
        id: "d1",
        clientId: "c1",
        currency: "EGP" as const,
        amountMinor: 10000,
        rateMinor: 5000,
        coins: 2,
        wacEgpMinor: 5000,
        egpValueMinor: 10000,
        createdAt: "now",
      },
      wallet: { clientId: "c1", coinBalance: 2 },
    }))
    const container = fakeContainer({ recordDeposit: recordDepositFn })
    const result = await recordDeposit(container, { clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(result).toEqual({
      ok: true,
      deposit: {
        id: "d1",
        currency: "EGP",
        amountMinor: 10000,
        rateMinor: 5000,
        coins: 2,
        wacEgpMinor: 5000,
        egpValueMinor: 10000,
        createdAt: "now",
      },
      wallet: { clientId: "c1", coinBalance: 2 },
    })
    expect(recordDepositFn).toHaveBeenCalledWith({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
  })
})

describe("recordFunding", () => {
  it("records a valid funding and maps the fields", async () => {
    const recordFundingFn = vi.fn(async () => ({
      id: "f1",
      egpPaidMinor: 10100,
      usdtMinor: 200,
      createdAt: "now",
    }))
    const container = fakeContainer({
      treasury: {
        recordFunding: recordFundingFn,
        snapshot: async () => ({ usdtMinor: 0, basisEgpMinor: 0, wacEgpMinor: 0 }),
        consumeForOrder: async () => {
          throw new Error("unused")
        },
        reconcile: async () => {
          throw new Error("unused")
        },
      } as any,
    })
    const result = await recordFunding(container, {
      egpPaidMinor: 10100,
      usdtMinor: 200,
    })
    expect(result).toEqual({
      ok: true,
      funding: {
        id: "f1",
        egpPaidMinor: 10100,
        usdtMinor: 200,
        createdAt: "now",
      },
    })
    expect(recordFundingFn).toHaveBeenCalledWith({
      egpPaidMinor: 10100,
      usdtMinor: 200,
    })
  })

  it("maps a RangeError from invalid amounts to ok:false invalid", async () => {
    const recordFundingFn = vi.fn(async () => {
      throw new RangeError()
    })
    const container = fakeContainer({
      treasury: {
        recordFunding: recordFundingFn,
        snapshot: async () => ({ usdtMinor: 0, basisEgpMinor: 0, wacEgpMinor: 0 }),
        consumeForOrder: async () => {
          throw new Error("unused")
        },
        reconcile: async () => {
          throw new Error("unused")
        },
      } as any,
    })
    const result = await recordFunding(container, {
      egpPaidMinor: 0,
      usdtMinor: 200,
    })
    expect(result).toEqual({ ok: false, error: "invalid" })
  })

  it("succeeds when usdtMinor is at or below free USDT", async () => {
    const recordFundingFn = vi.fn(async () => ({
      id: "f1",
      egpPaidMinor: 10100,
      usdtMinor: 600,
      createdAt: "now",
    }))
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 1000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      treasury: {
        recordFunding: recordFundingFn,
        snapshot: async () => ({ usdtMinor: 400, basisEgpMinor: 0, wacEgpMinor: 0 }),
        consumeForOrder: async () => {
          throw new Error("unused")
        },
        reconcile: async () => {
          throw new Error("unused")
        },
      } as any,
    })
    const result = await recordFunding(container, {
      egpPaidMinor: 10100,
      usdtMinor: 600,
    })
    expect(result.ok).toBe(true)
    expect(recordFundingFn).toHaveBeenCalledTimes(1)
  })

  it("rejects with exceeds_free when usdtMinor is above free USDT and appends nothing", async () => {
    const recordFundingFn = vi.fn(async () => ({
      id: "f1",
      egpPaidMinor: 10100,
      usdtMinor: 601,
      createdAt: "now",
    }))
    const container = fakeContainer({
      distributor: {
        getBalance: async () => ({ balanceMinor: 1000 }),
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      treasury: {
        recordFunding: recordFundingFn,
        snapshot: async () => ({ usdtMinor: 400, basisEgpMinor: 0, wacEgpMinor: 0 }),
        consumeForOrder: async () => {
          throw new Error("unused")
        },
        reconcile: async () => {
          throw new Error("unused")
        },
      } as any,
    })
    const result = await recordFunding(container, {
      egpPaidMinor: 10100,
      usdtMinor: 601,
    })
    expect(result).toEqual({ ok: false, error: "exceeds_free" })
    expect(recordFundingFn).not.toHaveBeenCalled()
  })

  it("fails closed with exceeds_free when the distributor balance read throws", async () => {
    const recordFundingFn = vi.fn(async () => ({
      id: "f1",
      egpPaidMinor: 10100,
      usdtMinor: 200,
      createdAt: "now",
    }))
    const container = fakeContainer({
      distributor: {
        getBalance: async () => {
          throw new Error("offline")
        },
        checkPlayer: async () => ({ valid: true, name: "P" }),
        placeOrder: async () => ({ distributorOrderId: "d", status: "PENDING" }),
        getOrder: async () => ({ distributorOrderId: "d", status: "COMPLETED" }),
      },
      treasury: {
        recordFunding: recordFundingFn,
        snapshot: async () => ({ usdtMinor: 0, basisEgpMinor: 0, wacEgpMinor: 0 }),
        consumeForOrder: async () => {
          throw new Error("unused")
        },
        reconcile: async () => {
          throw new Error("unused")
        },
      } as any,
    })
    const result = await recordFunding(container, {
      egpPaidMinor: 10100,
      usdtMinor: 200,
    })
    expect(result).toEqual({ ok: false, error: "exceeds_free" })
    expect(recordFundingFn).not.toHaveBeenCalled()
  })
})

describe("markup override actions", () => {
  it("rejects an invalid percentage", async () => {
    expect(await saveMarkupOverride(fakeContainer(), { clientId: "c1", markupPercent: -1 })).toEqual({
      ok: false,
      error: "invalid",
    })
    expect(await saveMarkupOverride(fakeContainer(), { clientId: "c1", markupPercent: Number.NaN })).toEqual({
      ok: false,
      error: "invalid",
    })
  })

  it("writes the override key with basis points, note and timestamp", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-04T05:06:07.000Z"))
    try {
      const set = vi.fn(async () => {})
      const container = fakeContainer({
        settings: { get: async () => null, set, delete: async () => {}, all: async () => ({}) },
      })

      expect(await saveMarkupOverride(container, { clientId: "c1", markupPercent: 7.5, note: "  خاص " })).toEqual({
        ok: true,
      })
      expect(set).toHaveBeenCalledWith(
        "markup:override:c1",
        JSON.stringify({ basisPoints: 750, note: "خاص", updatedAt: "2026-03-04T05:06:07.000Z" }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it("clears the override key", async () => {
    const del = vi.fn(async () => {})
    const container = fakeContainer({
      settings: { get: async () => null, set: async () => {}, delete: del, all: async () => ({}) },
    })

    expect(await clearMarkupOverride(container, "c1")).toEqual({ ok: true })
    expect(del).toHaveBeenCalledWith("markup:override:c1")
  })
})

describe("rollbackFunding", () => {
  it("success calls remove and returns {ok:true}", async () => {
    const remove = vi.fn(async () => true)
    const lot = { id: "f1", egpPaidMinor: 5000, usdtMinor: 100, createdAt: "2026-01-01T00:00:00.000Z" }
    const container = fakeContainer({
      fundings: {
        append: async () => {},
        totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }),
        listRecent: async () => [],
        findById: async () => lot,
        remove,
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 1000, basisEgpMinor: 50000, wacEgpMinor: 5000 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),
        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 0 },
    })

    await expect(rollbackFunding(container, "f1")).resolves.toEqual({ ok: true })
    expect(remove).toHaveBeenCalledWith("f1")
  })

  it("missing -> not_found", async () => {
    const remove = vi.fn(async () => true)
    const container = fakeContainer({
      fundings: {
        append: async () => {},
        totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }),
        listRecent: async () => [],
        findById: async () => null,
        remove,
      },
    })

    await expect(rollbackFunding(container, "missing")).resolves.toEqual({ ok: false, error: "not_found" })
    expect(remove).not.toHaveBeenCalled()
  })

  it("rejects empty id with invalid", async () => {
    await expect(rollbackFunding(fakeContainer(), "")).resolves.toEqual({ ok: false, error: "invalid" })
  })

  it("recordedAfter < reserved -> locked, no remove", async () => {
    const remove = vi.fn(async () => true)
    const lot = { id: "f1", egpPaidMinor: 5000, usdtMinor: 900, createdAt: "2026-01-01T00:00:00.000Z" }
    const container = fakeContainer({
      fundings: {
        append: async () => {},
        totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }),
        listRecent: async () => [],
        findById: async () => lot,
        remove,
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 1000, basisEgpMinor: 50000, wacEgpMinor: 5000 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),
        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      // coinValueMinor defaults to 1 (1 cent), so 200 coins = 200 reserved
      // recordedAfter = 1000 - 900 = 100 < 200 -> locked
      coinSupply: { totalCoins: async () => 200 },
    })

    await expect(rollbackFunding(container, "f1")).resolves.toEqual({ ok: false, error: "locked" })
    expect(remove).not.toHaveBeenCalled()
  })

  it("basisAfter < 0 -> locked", async () => {
    const remove = vi.fn(async () => true)
    const lot = { id: "f1", egpPaidMinor: 60000, usdtMinor: 100, createdAt: "2026-01-01T00:00:00.000Z" }
    const container = fakeContainer({
      fundings: {
        append: async () => {},
        totals: async () => ({ usdtMinor: 0, basisEgpMinor: 0 }),
        listRecent: async () => [],
        findById: async () => lot,
        remove,
      },
      treasury: {
        snapshot: async () => ({ usdtMinor: 1000, basisEgpMinor: 50000, wacEgpMinor: 5000 }),
        recordFunding: async () => ({ id: "f", egpPaidMinor: 0, usdtMinor: 0, createdAt: "now" }),
        consumeForOrder: async () => { throw new Error("unused") },
        reconcile: async () => { throw new Error("unused") },
      } as any,
      coinSupply: { totalCoins: async () => 0 },
    })

    await expect(rollbackFunding(container, "f1")).resolves.toEqual({ ok: false, error: "locked" })
    expect(remove).not.toHaveBeenCalled()
  })
})
