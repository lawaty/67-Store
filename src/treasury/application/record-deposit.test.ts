import { describe, expect, it, vi } from "vitest"
import { createRecordDeposit } from "./record-deposit"
import { DepositRepository } from "../ports/deposit-repository"
import { Deposit } from "../domain/deposit"
import { TreasuryService } from "./service"
import { WalletRepository, Wallet } from "@/wallet"
import { CoinSupplyRepository } from "@/wallet"
import { SettingsRepository } from "@/shared/settings-repository"
import { readDepositRate } from "@/treasury/application/deposit-settings"

function createDepositRepo(): DepositRepository & { items: Deposit[] } {
  const items: Deposit[] = []
  return {
    items,
    append: async (d: Deposit) => {
      items.push(d)
    },
    list: async () => items.slice(),
    listByClient: async (clientId: string, limit: number) => items.filter((d) => d.clientId === clientId).slice(0, limit),
    listRecent: async (limit: number) => {
      const copy = items.slice()
      copy.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      return copy.slice(0, limit)
    },
    listSince: async (since: string) => {
      const copy = items.filter((d) => d.createdAt >= since)
      copy.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0))
      return copy
    },
    coinWacEgpMinor: async () => {
      const egpSum = items.reduce((s, d) => s + d.egpValueMinor, 0)
      const coinsSum = items.reduce((s, d) => s + d.coins, 0)
      if (coinsSum === 0) return 0
      return Math.floor(egpSum / coinsSum + 0.5)
    },
  }
}

function createWalletRepo(): WalletRepository & { credits: { clientId: string; amount: number; reason: string }[] } {
  const credits: { clientId: string; amount: number; reason: string }[] = []
  let balance = 0
  return {
    credits,
    getOrCreate: async (clientId: string) => ({ clientId, coinBalance: balance }),
    credit: async (clientId: string, amount: number, reason: string) => {
      credits.push({ clientId, amount, reason })
      balance += amount
      return { clientId, coinBalance: balance }
    },
    debit: async () => true,
    listEntries: async () => [],
    findEntryByReference: async () => null,
    reverseDebit: async () => {},
  }
}

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

describe("recordDeposit", () => {
  it("EGP success", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings() // default EGP market 48.5, WAC 5000 wins
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({
      ok: true,
      deposit: {
        id: "d1",
        clientId: "c1",
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
    expect(deposits.items).toHaveLength(1)
    expect(wallets.credits).toEqual([{ clientId: "c1", amount: 2, reason: "deposit:d1" }])
  })

  it("USD (= USDT) success", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings() // default EGP market 48.5, coin value 100
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "USD", amountMinor: 200 })
    expect(outcome).toEqual({
      ok: true,
      deposit: {
        id: "d1",
        clientId: "c1",
        currency: "USD",
        amountMinor: 200,
        rateMinor: 100,
        coins: 2,
        wacEgpMinor: 5000,
        egpValueMinor: 9700,
        createdAt: "now",
      },
      wallet: { clientId: "c1", coinBalance: 2 },
    })
    expect(deposits.items).toHaveLength(1)
    expect(wallets.credits).toEqual([{ clientId: "c1", amount: 2, reason: "deposit:d1" }])
  })

  it("remainder rounds down and can yield 0 coins", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 1000 })
    expect(outcome).toEqual({ ok: false, error: "amount" })
  })

  it("coverage rejection against available USDT", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 0,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "coverage" })
  })

  it("rejects a deposit that exceeds available USDT even if live balance would fit", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 100,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    // 10000 EGP at 5000/coin => 2 coins = 200 USDT minor, available 100 => rejected
    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "coverage" })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })

  it("accepts a deposit within available USDT", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.deposit.coins).toBe(2)
    }
  })

  it("SAR deposit records EGP value from reserved coin USDT and EGP rate", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings({ "rate:egp": "50" }) // 5000 EGP minor per USDT
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "SAR", amountMinor: 375 })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.deposit.rateMinor).toBe(375)
      expect(outcome.deposit.coins).toBe(1)
      expect(outcome.deposit.egpValueMinor).toBe(5000)
    }
  })

  it("rate failure", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    // Force readDepositRate to throw RangeError by making wacEgpMinor NaN via treasury snapshot
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: NaN as any }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "rate" })
  })

  it("recordedUsdt throws -> balance error, no writes", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => {
        throw new Error("snapshot down")
      },
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "balance" })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })

  it("coinSupply.totalCoins throws -> balance error, no writes", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = {
      totalCoins: async () => {
        throw new Error("db down")
      },
    }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome).toEqual({ ok: false, error: "balance" })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })

  it("appends before crediting with reason deposit:<id> and returns the quote-derived coins", async () => {
    const deposits = createDepositRepo()
    const wallets = createWalletRepo()
    const settings = createSettings()
    const treasury: Pick<TreasuryService, "snapshot"> = {
      snapshot: async () => ({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 5000 }),
    }
    const coinSupply: CoinSupplyRepository = { totalCoins: async () => 0 }

    const order: string[] = []
    const originalAppend = deposits.append
    deposits.append = async (d: Deposit) => {
      order.push(`append:${d.id}`)
      return originalAppend(d)
    }
    const originalCredit = wallets.credit
    wallets.credit = async (clientId: string, amount: number, reason: string) => {
      order.push(`credit:${reason}`)
      return originalCredit(clientId, amount, reason)
    }

    const record = createRecordDeposit({
      deposits,
      treasury,
      wallets,
      coinSupply,
      recordedUsdt: async () => 10000,
      settings,
      coinValueMinor: async () => 100,
      newId: () => "d1",
      now: () => "now",
    })

    const outcome = await record({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(outcome.ok).toBe(true)
    if (outcome.ok) {
      expect(outcome.deposit.coins).toBe(2)
      expect(outcome.wallet).toEqual({ clientId: "c1", coinBalance: 2 })
    }
    expect(order).toEqual(["append:d1", "credit:deposit:d1"])
    expect(deposits.items).toHaveLength(1)
    expect(wallets.credits).toEqual([{ clientId: "c1", amount: 2, reason: "deposit:d1" }])
  })
})
