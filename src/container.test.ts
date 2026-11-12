import { beforeEach, describe, it, expect } from "vitest"
import { PrismaClient } from "@prisma/client"
import { createContainer } from "./container"
import { readEnv } from "./env"
import { product } from "@/catalogue"
import { player } from "@/ordering"
import { order } from "@/ordering"
import { client } from "@/accounts"
import { money } from "./shared/money"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

beforeEach(() => {
  process.env.FAKE_PAYMENTS_FILE = "/nonexistent/fake-payments"
  process.env.FAKE_FULFILMENT_FILE = "/nonexistent/fake-fulfilment"
})

function createMemoryDb(initialSettings: Record<string, string> = {}) {
  const settingsStore = new Map<string, string>(Object.entries(initialSettings))
  const productStore = new Map<
    string,
    { id: string; game: string; distributorId: string; name: string; costMinor: number; currency: string; active: boolean; syncedAt: Date }
  >()
  const costHistory: Array<{ productId: string; costMinor: number; currency: string; recordedAt: Date }> = []
  const fundingStore: Array<{ id: string; egpPaidMinor: number; usdtMilli: number; createdAt: Date }> = []
  const consumptionStore: Array<{ id: string; orderId: string; usdtMilli: number; basisEgpMinor: number; wacEgpMinor: number; createdAt: Date }> = []
  const reconciliationStore: Array<{ id: string; expectedUsdtMinor: number; supplierUsdtMinor: number; gapUsdtMinor: number; status: string; createdAt: Date }> = []
  const walletStore = new Map<string, { id: string; clientId: string; coinBalance: number }>()
  const paymentStore = new Map<string, { id: string; orderId: string; provider: string; providerReference: string; amountMinor: number; currency: string; status: string }>()
  const walletFundingStore = new Map<string, any>()
  const walletEntryStore: Array<{ id: string; walletId: string; amount: number; reason: string; createdAt: Date }> = []
  const depositStore: Array<any> = []
  const alertStore: Array<any> = []
  let walletSeq = 0
  let entrySeq = 0

  const setting = {
    findUnique: async (args: { where: { key: string } }) => {
      const value = settingsStore.get(args.where.key)
      return value === undefined ? null : { key: args.where.key, value }
    },
    upsert: async (args: { create: { key: string; value: string } }) => {
      settingsStore.set(args.create.key, args.create.value)
      return { key: args.create.key, value: args.create.value }
    },
    deleteMany: async (args: { where: { key: string } }) => {
      const existed = settingsStore.delete(args.where.key)
      return { count: existed ? 1 : 0 }
    },
    findMany: async () => Array.from(settingsStore.entries()).map(([key, value]) => ({ key, value })),
  }

  const product = {
    upsert: async (args: { where: { id: string }; create: any; update: any }) => {
      const existing = productStore.get(args.where.id)
      const row = existing ? { ...existing, ...args.update } : { ...args.create }
      productStore.set(args.where.id, row)
      return row
    },
    findMany: async (args: any) => {
      let rows = Array.from(productStore.values()).map((r) => ({ ...r }))
      if (args?.where?.game !== undefined) rows = rows.filter((r) => r.game === args.where.game)
      if (args?.where?.active !== undefined) rows = rows.filter((r) => r.active === args.where.active)
      if (Array.isArray(args?.orderBy)) {
        rows.sort((a, b) => {
          if (a.distributorId !== b.distributorId) return a.distributorId < b.distributorId ? -1 : 1
          return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
        })
      } else if (args?.orderBy?.costMinor === "asc") {
        rows.sort((a, b) => a.costMinor - b.costMinor)
      }
      return rows
    },
    updateMany: async (args: any) => {
      const keep = new Set<string>(args.where.id.notIn ?? [])
      let count = 0
      for (const row of productStore.values()) {
        if (row.game === args.where.game && row.active === true && !keep.has(row.id)) {
          productStore.set(row.id, { ...row, active: false })
          count++
        }
      }
      return { count }
    },
    findUnique: async (args: any) => {
      const row = productStore.get(args.where.id)
      return row ? { ...row } : null
    },
  }

  const productCostHistory = {
    createMany: async (args: { data: Array<{ productId: string; costMinor: number; currency: string }> }) => {
      for (const r of args.data) costHistory.push({ ...r, recordedAt: new Date() })
      return { count: args.data.length }
    },
    aggregate: async () => {
      let max: Date | null = null
      for (const r of costHistory) {
        if (max === null || r.recordedAt > max) max = r.recordedAt
      }
      return { _max: { recordedAt: max } }
    },
  }

  const funding = {
    create: async (args: { data: any }) => {
      fundingStore.push({ ...args.data })
      return { ...args.data }
    },
    aggregate: async () => ({
      _sum: {
        usdtMilli: fundingStore.reduce((s, r) => s + r.usdtMilli, 0),
        egpPaidMinor: fundingStore.reduce((s, r) => s + r.egpPaidMinor, 0),
      },
    }),
    findMany: async () => fundingStore.map((r) => ({ ...r })),
    findUnique: async (args: any) => {
      const row = fundingStore.find((r) => r.id === args.where.id)
      return row ? { ...row } : null
    },
    deleteMany: async (args: any) => {
      const idx = fundingStore.findIndex((r) => r.id === args.where.id)
      if (idx === -1) return { count: 0 }
      fundingStore.splice(idx, 1)
      return { count: 1 }
    },
  }

  const treasuryConsumption = {
    create: async (args: { data: any }) => {
      consumptionStore.push({ ...args.data })
      return { ...args.data }
    },
    aggregate: async (args: any) => {
      let rows = consumptionStore
      const gte = args?.where?.createdAt?.gte
      if (gte !== undefined) {
        const since = new Date(gte as never).getTime()
        rows = rows.filter((r) => new Date(r.createdAt).getTime() >= new Date(since).getTime())
      }
      return {
        _sum: {
          usdtMilli: rows.reduce((s, r) => s + r.usdtMilli, 0),
          basisEgpMinor: rows.reduce((s, r) => s + r.basisEgpMinor, 0),
        },
      }
    },
    findUnique: async (args: any) => {
      if (args.where.orderId !== undefined) {
        const row = consumptionStore.find((c) => c.orderId === args.where.orderId)
        return row ? { ...row } : null
      }
      const row = consumptionStore.find((c) => c.id === args.where.id)
      return row ? { ...row } : null
    },
    findMany: async () => consumptionStore.map((r) => ({ ...r })),
  }

  const wallet = {
    aggregate: async () => ({
      _sum: { coinBalance: Array.from(walletStore.values()).reduce((s, r) => s + r.coinBalance, 0) },
    }),
    upsert: async (args: { where: { clientId: string }; create: { clientId: string }; update: any }) => {
      let row = walletStore.get(args.where.clientId)
      if (!row) {
        walletSeq++
        row = { id: `wallet-${walletSeq}`, clientId: args.where.clientId, coinBalance: 0 }
        walletStore.set(args.where.clientId, row)
      }
      return { ...row }
    },
    update: async (args: any) => {
      const row = walletStore.get(args.where.clientId)
      if (!row) throw new Error("wallet not found")
      const inc = args.data?.coinBalance?.increment
      const dec = args.data?.coinBalance?.decrement
      if (typeof inc === "number") row.coinBalance += inc
      if (typeof dec === "number") row.coinBalance -= dec
      return { ...row }
    },
    findUnique: async (args: any) => {
      const row = walletStore.get(args.where.clientId)
      return row ? { ...row } : null
    },
    findFirst: async (args: any) => {
      const row = walletStore.get(args.where.clientId)
      if (!row) return null
      return { ...row, entries: walletEntryStore.filter((e) => e.walletId === row.id).map((e) => ({ ...e })) }
    },
  }

  const walletFunding = {
    create: async (args: { data: any }) => {
      walletFundingStore.set(args.data.id, { ...args.data })
      return { ...args.data }
    },
    findUnique: async (args: any) => {
      if (args.where.providerReference !== undefined) {
        for (const row of walletFundingStore.values()) {
          if (row.providerReference === args.where.providerReference) return { ...row }
        }
        return null
      }
      const row = walletFundingStore.get(args.where.id)
      return row ? { ...row } : null
    },
    updateMany: async (args: any) => {
      const row = walletFundingStore.get(args.where.id)
      if (!row || (args.where.status !== undefined && row.status !== args.where.status)) return { count: 0 }
      walletFundingStore.set(row.id, { ...row, ...args.data })
      return { count: 1 }
    },
    update: async (args: any) => {
      const row = walletFundingStore.get(args.where.id)
      if (!row) throw new Error("wallet funding not found")
      const next = { ...row, ...args.data }
      walletFundingStore.set(row.id, next)
      return { ...next }
    },
  }

  const payment = {
    create: async (args: { data: any }) => {
      paymentStore.set(args.data.providerReference, { ...args.data })
      return { ...args.data }
    },
    findUnique: async (args: any) => {
      const row = paymentStore.get(args.where.providerReference)
      return row ? { ...row } : null
    },
    findMany: async (args: any) => {
      let rows = Array.from(paymentStore.values()).map((r) => ({ ...r }))
      if (args?.where?.orderId !== undefined) rows = rows.filter((r) => r.orderId === args.where.orderId)
      return rows
    },
    update: async (args: any) => {
      const row = paymentStore.get(args.where.providerReference)
      if (!row) throw new Error("payment not found")
      const next = { ...row, ...args.data }
      paymentStore.set(row.providerReference, next)
      return { ...next }
    },
  }

  const deposit = {
    create: async (args: { data: any }) => {
      depositStore.push({ ...args.data })
      return { ...args.data }
    },
    findMany: async (args: any) => {
      let rows = depositStore.map((r) => ({ ...r }))
      if (args?.where?.clientId) rows = rows.filter((r) => r.clientId === args.where.clientId)
      return rows
    },
    aggregate: async () => {
      if (depositStore.length === 0) return { _sum: { egpValueMinor: null, coins: null } }
      return {
        _sum: {
          egpValueMinor: depositStore.reduce((s, r) => s + r.egpValueMinor, 0),
          coins: depositStore.reduce((s, r) => s + r.coins, 0),
        },
      }
    },
  }

  const reconciliation = {
    create: async (args: { data: any }) => {
      reconciliationStore.push({ ...args.data })
      return { ...args.data }
    },
    findFirst: async () =>
      reconciliationStore.length > 0 ? { ...reconciliationStore[reconciliationStore.length - 1] } : null,
  }

  const alert = {
    create: async (args: { data: any }) => {
      const row = { ...args.data, createdAt: new Date() }
      alertStore.push(row)
      return { ...row }
    },
    findMany: async () => alertStore.map((r) => ({ ...r })),
  }

  const walletEntry = {
    create: async (args: { data: any }) => {
      entrySeq++
      const row = { id: `entry-${entrySeq}`, ...args.data, createdAt: new Date() }
      walletEntryStore.push(row)
      return { ...row }
    },
  }

  const core: any = {
    setting,
    product,
    productCostHistory,
    funding,
    treasuryConsumption,
    wallet,
    walletFunding,
    payment,
    deposit,
    reconciliation,
    alert,
    walletEntry,
    $queryRawUnsafe: async () => [],
    $transaction: async (arg: any) => {
      if (Array.isArray(arg)) {
        await Promise.all(arg)
        return undefined
      }
      if (typeof arg === "function") return arg(core)
      throw new Error("unsupported $transaction argument")
    },
  }

  const db = new Proxy(core, {
    get: (target: any, prop: string | symbol) => {
      if (typeof prop !== "string") return target[prop as any]
      if (prop in target) return target[prop]
      return async () => ({})
    },
  }) as unknown as PrismaClient

  return { db, settingsStore, productStore, walletFundingStore, paymentStore }
}

describe("createContainer", () => {
  it("returns an object with every key in the Container type, each defined", () => {
    const stubDb = new Proxy({}, {
      get: () => () => ({}),
    }) as unknown as PrismaClient
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k" }), stubDb)
    expect(container.products).toBeDefined()
    expect(container.clients).toBeDefined()
    expect(container.orders).toBeDefined()
    expect(container.payments).toBeDefined()
    expect(container.webhookEvents).toBeDefined()
    expect(container.settings).toBeDefined()
    expect(container.syncCatalogue).toBeDefined()
    expect(container.placeOrder).toBeDefined()
    expect(container.startPayment).toBeDefined()
    expect(container.paymentProviderAvailable).toBeDefined()
    expect(container.confirmPayment).toBeDefined()
    expect(container.fulfilOrder).toBeDefined()
    expect(container.syncFulfilment).toBeDefined()
  })

  it("calling createContainer twice with the same stub and a counting clock returns distinct placeOrder wrappers (function identity differs)", () => {
    const stubDb = new Proxy({}, {
      get: () => () => ({}),
    }) as unknown as PrismaClient
    let count = 0
    const clock = () => {
      count++
      return String(count)
    }
    const container1 = createContainer(readEnv({ G2BULK_API_KEY: "k" }), stubDb, clock)
    const container2 = createContainer(readEnv({ G2BULK_API_KEY: "k" }), stubDb, clock)
    expect(container1.placeOrder).not.toBe(container2.placeOrder)
  })

  it("builds lazily without a live rail when payment mode is instapay", () => {
    const stubDb = new Proxy({}, {
      get: () => () => ({}),
    }) as unknown as PrismaClient
    expect(() => createContainer(readEnv({ G2BULK_API_KEY: "k", PAYMENT_PROVIDER: "instapay" }), stubDb)).not.toThrow()
  })

  it("default clock wiring: a now()-dependent write receives a valid ISO timestamp, not a UUID", async () => {
    const tx = new Proxy({}, { get: () => new Proxy({}, { get: () => async () => ({}) }) })
    const stubDb = new Proxy({}, {
      get: (_target, property) =>
        property === "$transaction"
          ? async (fn: (transaction: unknown) => Promise<unknown>) => fn(tx)
          : new Proxy({}, { get: () => async () => ({}) }),
    }) as unknown as PrismaClient
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k" }), stubDb)
    const funding = await container.treasury.recordFunding({
      egpPaidMinor: 100,
      usdtMilli: 1000,
    })
    expect(Number.isNaN(new Date(funding.createdAt).getTime())).toBe(false)
    // and it must not be a UUID-shaped value
    expect(funding.createdAt).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/)
  })
})

describe("createContainer fulfilment fake flag", () => {
  it("uses the fake distributor for place/get when fake-fulfilment is on", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fake-fulfilment-"))
    const file = join(dir, "flag")
    writeFileSync(file, "true")
    const previous = process.env.FAKE_FULFILMENT_FILE
    process.env.FAKE_FULFILMENT_FILE = file
    try {
      const { db } = createMemoryDb()
      const container = createContainer(readEnv({ G2BULK_API_KEY: "k" }), db)
      const item = product({
        id: "mlbb:fake-86",
        distributorId: "fake-86",
        name: "86 جوهرة",
        cost: money(99, "USD"),
        game: "mlbb",
      })

      await expect(
        container.distributor.placeOrder({ orderId: "o1", game: "mlbb", product: item, player: player("123", "456") }),
      ).resolves.toEqual({ distributorOrderId: "fake-o1", status: "COMPLETED" })
      await expect(
        container.distributor.getOrder({ distributorOrderId: "d1", game: "mlbb" }),
      ).resolves.toEqual({ distributorOrderId: "d1", status: "COMPLETED" })
    } finally {
      if (previous === undefined) delete process.env.FAKE_FULFILMENT_FILE
      else process.env.FAKE_FULFILMENT_FILE = previous
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("createContainer payment mode dispatch", () => {
  function awaitingOrder() {
    const item = product({
      id: "mlbb:fake-86",
      distributorId: "fake-86",
      name: "86 جوهرة",
      cost: money(99, "USD"),
      game: "mlbb",
    })
    return order({
      id: "o1",
      token: "t1",
      profileId: "p1",
      client: client("c1"),
      product: item,
      player: player("1", "2"),
      price: money(12000, "USD"),
      status: "AWAITING_PAYMENT",
      markupBasisPoints: 2000,
    })
  }

  it("rejects live startPayment when paymentMode is fake", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k" }), db)
    await expect(
      container.startPayment({ order: awaitingOrder(), provider: "PAYMOB", returnUrl: "/order/t1" }),
    ).rejects.toThrow("Payment provider fake is not configured for live mode")
  })

  it("rejects live startPayment with the paymentMode when it is not fake", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k", PAYMENT_PROVIDER: "instapay" }), db)
    await expect(
      container.startPayment({ order: awaitingOrder(), provider: "PAYMOB", returnUrl: "/order/t1" }),
    ).rejects.toThrow("Payment provider instapay is not configured")
  })

  it("charges through the fake when fake-payments is on", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k", ALLOW_FAKE_PAYMENTS: "true" }), db)
    const result = await container.startPayment({
      order: awaitingOrder(),
      provider: "PAYMOB",
      returnUrl: "/order/t1",
    })
    expect(result.payment.providerReference).toBe("fake_paymob_o1")
    expect(result.redirectUrl).toBe("/checkout/fake/fake_paymob_o1")
    expect(result.payment.status).toBe("PENDING")
  })

  it("charges through the fake in live when ALLOW_FAKE_PAYMENTS is true", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k", ALLOW_FAKE_PAYMENTS: "true" }), db)
    const result = await container.startPayment({
      order: awaitingOrder(),
      provider: "PAYMOB",
      returnUrl: "/order/t1",
    })
    expect(result.payment.providerReference).toBe("fake_paymob_o1")
    expect(result.redirectUrl).toBe("/checkout/fake/fake_paymob_o1")
    expect(result.payment.status).toBe("PENDING")
  })

  it("fakePaymentsEnabled follows the fake-payments flag", async () => {
    const off = createContainer(readEnv({ G2BULK_API_KEY: "k" }), createMemoryDb().db)
    await expect(off.fakePaymentsEnabled()).resolves.toBe(false)

    const on = createContainer(readEnv({ G2BULK_API_KEY: "k", ALLOW_FAKE_PAYMENTS: "true" }), createMemoryDb().db)
    await expect(on.fakePaymentsEnabled()).resolves.toBe(true)
  })

  it("paymentProviderAvailable follows the fake-payments flag", async () => {
    const off = createContainer(readEnv({ G2BULK_API_KEY: "k" }), createMemoryDb().db)
    await expect(off.paymentProviderAvailable("PAYMOB")).resolves.toBe(false)

    const on = createContainer(readEnv({ G2BULK_API_KEY: "k", ALLOW_FAKE_PAYMENTS: "true" }), createMemoryDb().db)
    await expect(on.paymentProviderAvailable("PAYMOB")).resolves.toBe(true)
  })
})

describe("createContainer wallet funding coverage", () => {
  it("startWalletFunding with an empty treasury fails coverage", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k" }), db)
    await expect(
      container.startWalletFunding({ clientId: "c1", currency: "EGP", amountMinor: 10000 }),
    ).resolves.toEqual({ ok: false, error: "coverage" })
  })
})

describe("createContainer paymob live provider", () => {
  it("reports PAYMOB available and others unavailable when paymob is configured in live mode", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(
      readEnv({
        G2BULK_API_KEY: "k",
        PAYMENT_PROVIDER: "paymob",
        ALLOW_FAKE_PAYMENTS: "false",
        PAYMOB_SECRET_KEY: "sk",
        PAYMOB_PUBLIC_KEY: "pk",
        PAYMOB_INTEGRATION_ID_CARD: "123",
        APP_URL: "https://app.example.com",
      }),
      db,
    )
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(true)
    await expect(container.paymentProviderAvailable("CRYPTO")).resolves.toBe(false)
    await expect(container.paymentProviderAvailable("COINS")).resolves.toBe(false)
  })

  it("reports PAYMOB unavailable when PAYMOB_SECRET_KEY is empty", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(
      readEnv({
        G2BULK_API_KEY: "k",
        PAYMENT_PROVIDER: "paymob",
        ALLOW_FAKE_PAYMENTS: "false",
        PAYMOB_SECRET_KEY: "",
        PAYMOB_PUBLIC_KEY: "pk",
        PAYMOB_INTEGRATION_ID_CARD: "123",
        APP_URL: "https://app.example.com",
      }),
      db,
    )
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(false)
  })

  it("reports PAYMOB unavailable when all integration ids are empty", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(
      readEnv({
        G2BULK_API_KEY: "k",
        PAYMENT_PROVIDER: "paymob",
        ALLOW_FAKE_PAYMENTS: "false",
        PAYMOB_SECRET_KEY: "sk",
        PAYMOB_PUBLIC_KEY: "pk",
        PAYMOB_INTEGRATION_ID_CARD: "",
        PAYMOB_INTEGRATION_ID_WALLET: "",
        APP_URL: "https://app.example.com",
      }),
      db,
    )
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(false)
  })

  it("reports PAYMOB unavailable when APP_URL is empty", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(
      readEnv({
        G2BULK_API_KEY: "k",
        PAYMENT_PROVIDER: "paymob",
        ALLOW_FAKE_PAYMENTS: "false",
        PAYMOB_SECRET_KEY: "sk",
        PAYMOB_PUBLIC_KEY: "pk",
        PAYMOB_INTEGRATION_ID_CARD: "123",
        APP_URL: "",
      }),
      db,
    )
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(false)
  })

  it("uses fake rails for paymob when fake-payments is on", async () => {
    const { db } = createMemoryDb()
    const container = createContainer(
      readEnv({
        G2BULK_API_KEY: "k",
        ALLOW_FAKE_PAYMENTS: "true",
        PAYMENT_PROVIDER: "paymob",
        PAYMOB_SECRET_KEY: "sk",
        PAYMOB_PUBLIC_KEY: "pk",
        PAYMOB_INTEGRATION_ID_CARD: "123",
        APP_URL: "https://app.example.com",
      }),
      db,
    )
    const item = product({
      id: "mlbb:fake-86",
      distributorId: "fake-86",
      name: "86 جوهرة",
      cost: money(99, "USD"),
      game: "mlbb",
    })
    const awaiting = order({
      id: "o1",
      token: "t1",
      profileId: "p1",
      client: client("c1"),
      product: item,
      player: player("1", "2"),
      price: money(12000, "USD"),
      status: "AWAITING_PAYMENT",
      markupBasisPoints: 2000,
    })
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(true)
    const result = await container.startPayment({
      order: awaiting,
      provider: "PAYMOB",
      returnUrl: "/order/t1",
    })
    expect(result.payment.providerReference).toBe("fake_paymob_o1")
  })

  it("honours gateway toggles per call for provider availability", async () => {
    const { db, settingsStore } = createMemoryDb()
    const container = createContainer(
      readEnv({
        G2BULK_API_KEY: "k",
        PAYMENT_PROVIDER: "paymob",
        ALLOW_FAKE_PAYMENTS: "false",
        PAYMOB_SECRET_KEY: "sk",
        PAYMOB_PUBLIC_KEY: "pk",
        PAYMOB_INTEGRATION_ID_CARD: "123",
        APP_URL: "https://app.example.com",
      }),
      db,
    )
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(true)
    settingsStore.set("gateway:card:enabled", "false")
    settingsStore.set("gateway:wallet:enabled", "false")
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(false)
  })

  it("reports PAYMOB unavailable when both card and wallet toggles are off even if configured", async () => {
    const { db } = createMemoryDb({
      "gateway:card:enabled": "false",
      "gateway:wallet:enabled": "false",
    })
    const container = createContainer(
      readEnv({
        G2BULK_API_KEY: "k",
        PAYMENT_PROVIDER: "paymob",
        ALLOW_FAKE_PAYMENTS: "false",
        PAYMOB_SECRET_KEY: "sk",
        PAYMOB_PUBLIC_KEY: "pk",
        PAYMOB_INTEGRATION_ID_CARD: "123",
        PAYMOB_INTEGRATION_ID_WALLET: "456",
        APP_URL: "https://app.example.com",
      }),
      db,
    )
    await expect(container.paymentProviderAvailable("PAYMOB")).resolves.toBe(false)
  })

  it("fulfilOrder returns input without fulfilling when fulfilment is disabled", async () => {
    const { db } = createMemoryDb({ "fulfilment:enabled": "false" })
    const container = createContainer(readEnv({ G2BULK_API_KEY: "k" }), db)
    const item = product({
      id: "mlbb:fake-86",
      distributorId: "fake-86",
      name: "86 جوهرة",
      cost: money(99, "USD"),
      game: "mlbb",
    })
    const paid = order({
      id: "o1",
      token: "t1",
      profileId: "p1",
      client: client("c1"),
      product: item,
      player: player("1", "2"),
      price: money(12000, "USD"),
      status: "PAID",
      markupBasisPoints: 2000,
      paymentReference: "ref",
    })
    const result = await container.fulfilOrder(paid)
    expect(result).toBe(paid)
  })
})
