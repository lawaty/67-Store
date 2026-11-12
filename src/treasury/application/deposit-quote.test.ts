import { describe, expect, it } from "vitest"
import { createQuoteDeposit, depositFromQuote, DepositQuote } from "./deposit-quote"
import { TreasuryService } from "./service"
import { CoinSupplyRepository } from "@/wallet"
import { SettingsRepository } from "@/shared/settings-repository"

function createSettings(initial: Record<string, string> = {}): SettingsRepository {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    get: async (key: string) => (store.has(key) ? store.get(key)! : null),
    set: async (key: string, value: string) => {
      store.set(key, value)
    },
    delete: async (key: string) => {
      store.delete(key)
    },
    all: async () => Object.fromEntries(store.entries()),
  }
}

function createQuote(overrides: {
  settings?: SettingsRepository
  wacEgpMinor?: number
  coinSupply?: CoinSupplyRepository
  recordedUsdt?: () => Promise<number>
  coinValueMinor?: () => Promise<number>
} = {}) {
  return createQuoteDeposit({
    treasury: {
      snapshot: async () => ({
        usdtMilli: 0,
        basisEgpMinor: 0,
        wacEgpMinor: overrides.wacEgpMinor ?? 5000,
      }),
    } as Pick<TreasuryService, "snapshot">,
    coinSupply: overrides.coinSupply ?? { totalCoins: async () => 0 },
    recordedUsdt: overrides.recordedUsdt ?? (async () => 10000),
    settings: overrides.settings ?? createSettings(),
    coinValueMinor: overrides.coinValueMinor ?? (async () => 100),
  })
}

describe("quoteDeposit", () => {
  it("EGP amount -> correct rate/coins/egpValue", async () => {
    const quote = createQuote()
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({
      ok: true,
      quote: {
        currency: "EGP",
        amountMinor: 10000,
        rateMinor: 5000,
        coins: 2,
        wacEgpMinor: 5000,
        egpValueMinor: 10000,
        coinValueMinor: 100,
      },
    })
  })

  it("USD amount -> correct rate/coins and EGP book value from the manual rate", async () => {
    const quote = createQuote()
    const outcome = await quote({ currency: "USD", amountMinor: 200 })
    expect(outcome).toEqual({
      ok: true,
      quote: {
        currency: "USD",
        amountMinor: 200,
        rateMinor: 100,
        coins: 2,
        wacEgpMinor: 5000,
        egpValueMinor: 9700,
        coinValueMinor: 100,
      },
    })
  })

  it("SAR deposit records EGP value from reserved coin USDT and EGP rate", async () => {
    const quote = createQuote({ settings: createSettings({ "rate:egp": "50" }) })
    const outcome = await quote({ currency: "SAR", amountMinor: 375 })
    expect(outcome).toEqual({
      ok: true,
      quote: {
        currency: "SAR",
        amountMinor: 375,
        rateMinor: 375,
        coins: 1,
        wacEgpMinor: 5000,
        egpValueMinor: 5000,
        coinValueMinor: 100,
      },
    })
  })

  it("remainder rounds down and can yield 0 coins -> amount", async () => {
    const quote = createQuote()
    const outcome = await quote({ currency: "EGP", amountMinor: 1000 })
    expect(outcome).toEqual({ ok: false, error: "amount" })
  })

  it("amount <= 0/non-integer -> amount", async () => {
    const quote = createQuote()
    expect(await quote({ currency: "EGP", amountMinor: 0 })).toEqual({ ok: false, error: "amount" })
    expect(await quote({ currency: "EGP", amountMinor: -100 })).toEqual({ ok: false, error: "amount" })
    expect(await quote({ currency: "EGP", amountMinor: 100.5 })).toEqual({ ok: false, error: "amount" })
    expect(await quote({ currency: "EGP", amountMinor: NaN })).toEqual({ ok: false, error: "amount" })
  })

  it("invalid currency -> amount", async () => {
    const quote = createQuote()
    const outcome = await quote({ currency: "EUR" as any, amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "amount" })
  })

  it("rate error", async () => {
    // Force readDepositRate to throw RangeError by making wacEgpMinor NaN via treasury snapshot
    const quote = createQuote({ wacEgpMinor: NaN as any })
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "rate" })
  })

  it("coinValueMinor RangeError -> rate", async () => {
    const quote = createQuote({
      coinValueMinor: async () => {
        throw new RangeError()
      },
    })
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "rate" })
  })

  it("recordedUsdt throws -> balance", async () => {
    const quote = createQuote({
      recordedUsdt: async () => {
        throw new Error("snapshot down")
      },
    })
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "balance" })
  })

  it("coinSupply.totalCoins throws -> balance", async () => {
    const quote = createQuote({
      coinSupply: {
        totalCoins: async () => {
          throw new Error("db down")
        },
      },
    })
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "balance" })
  })

  it("insufficient coverage -> coverage", async () => {
    const quote = createQuote({ recordedUsdt: async () => 0 })
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "coverage" })
  })

  it("rejects a quote that exceeds available USDT even if live balance would fit", async () => {
    const quote = createQuote({ recordedUsdt: async () => 100 })
    // 10000 EGP at 5000/coin => 2 coins = 200 USDT minor, available 100 => rejected
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "coverage" })
  })

  it("accepts a quote within available USDT", async () => {
    const quote = createQuote()
    const outcome = await quote({ currency: "EGP", amountMinor: 10000 })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.quote.coins).toBe(2)
    }
  })
})

describe("depositFromQuote", () => {
  it("produces the exact Deposit", () => {
    const quote: DepositQuote = {
      currency: "EGP",
      amountMinor: 10000,
      rateMinor: 5000,
      coins: 2,
      wacEgpMinor: 5000,
      egpValueMinor: 10000,
      coinValueMinor: 100,
    }
    const d = depositFromQuote({ id: "d1", clientId: "c1", createdAt: "now", quote })
    expect(d).toEqual({
      id: "d1",
      clientId: "c1",
      currency: "EGP",
      amountMinor: 10000,
      rateMinor: 5000,
      coins: 2,
      wacEgpMinor: 5000,
      egpValueMinor: 10000,
      createdAt: "now",
    })
  })

  it("validates via the domain factory", () => {
    const quote: DepositQuote = {
      currency: "EGP",
      amountMinor: 10000,
      rateMinor: 5000,
      coins: 2,
      wacEgpMinor: 5000,
      egpValueMinor: 10000,
      coinValueMinor: 100,
    }
    expect(() => depositFromQuote({ id: "", clientId: "c1", createdAt: "now", quote })).toThrow(RangeError)
    expect(() => depositFromQuote({ id: "d1", clientId: "  ", createdAt: "now", quote })).toThrow(RangeError)
    expect(() =>
      depositFromQuote({
        id: "d1",
        clientId: "c1",
        createdAt: "now",
        quote: { ...quote, coins: 0 },
      }),
    ).toThrow(RangeError)
  })
})
