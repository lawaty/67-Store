import { describe, expect, it, vi } from "vitest"
import { createStartWalletFunding, createSettleWalletFunding } from "./wallet-funding"
import { WalletFunding } from "../domain/wallet-funding"
import { WalletFundingRepository } from "../ports/wallet-funding-repository"
import { QuoteDepositOutcome, DepositQuote } from "./deposit-quote"
import { Deposit } from "../domain/deposit"

const NOW = "2026-11-07T01:00:00.000Z"
const CREATED = "2026-11-07T00:00:00.000Z"

function quoteOk(quote?: Partial<DepositQuote>): QuoteDepositOutcome {
  return {
    ok: true,
    quote: {
      currency: "EGP",
      amountMinor: 10000,
      rateMinor: 5000,
      coins: 2,
      wacEgpMinor: 5000,
      egpValueMinor: 10000,
      coinValueMinor: 100,
      ...quote,
    },
  }
}

function createFundings(
  initial: WalletFunding[] = [],
): WalletFundingRepository & {
  created: WalletFunding[]
  markPaidCalls: { id: string; paidAt: string }[]
  attachCalls: { id: string; depositId: string }[]
  items: WalletFunding[]
} {
  const items: WalletFunding[] = [...initial]
  const created: WalletFunding[] = []
  const markPaidCalls: { id: string; paidAt: string }[] = []
  const attachCalls: { id: string; depositId: string }[] = []
  return {
    items,
    created,
    markPaidCalls,
    attachCalls,
    create: async (funding: WalletFunding) => {
      created.push(funding)
      items.push(funding)
    },
    findByReference: async (providerReference: string) =>
      items.find((f) => f.providerReference === providerReference) ?? null,
    markPaid: async (id: string, paidAt: string) => {
      markPaidCalls.push({ id, paidAt })
      const idx = items.findIndex((f) => f.id === id && f.status === "PENDING")
      if (idx === -1) return false
      items[idx] = { ...items[idx], status: "PAID", paidAt }
      return true
    },
    attachDeposit: async (id: string, depositId: string) => {
      attachCalls.push({ id, depositId })
      const idx = items.findIndex((f) => f.id === id)
      if (idx !== -1) items[idx] = { ...items[idx], depositId }
    },
  }
}

function pendingFunding(overrides: Partial<WalletFunding> = {}): WalletFunding {
  return {
    id: "f1",
    clientId: "c1",
    currency: "EGP",
    amountMinor: 10000,
    rateMinor: 5000,
    coins: 2,
    wacEgpMinor: 5000,
    egpValueMinor: 10000,
    provider: "INSTAPAY",
    providerReference: "fake_instapay_fund_f1",
    status: "PENDING",
    depositId: null,
    createdAt: CREATED,
    paidAt: null,
    ...overrides,
  }
}

function createDeposits() {
  const items: Deposit[] = []
  return {
    items,
    append: async (d: Deposit) => {
      items.push(d)
    },
  }
}

function createWallets() {
  const credits: { clientId: string; amount: number; reason: string }[] = []
  return {
    credits,
    credit: async (clientId: string, amount: number, reason: string) => {
      credits.push({ clientId, amount, reason })
      return { clientId, coinBalance: amount }
    },
  }
}

describe("startWalletFunding", () => {
  it("rejects empty clientId as amount", async () => {
    const fundings = createFundings()
    const start = createStartWalletFunding({
      quote: async () => quoteOk(),
      fundings,
      newId: () => "f1",
      now: () => NOW,
    })
    expect(await start({ clientId: "  ", currency: "EGP", amountMinor: 10000 })).toEqual({
      ok: false,
      error: "amount",
    })
    expect(fundings.created).toHaveLength(0)
  })

  it("quote error passes through unchanged", async () => {
    const fundings = createFundings()
    const errorOutcome: QuoteDepositOutcome = { ok: false, error: "coverage" }
    const start = createStartWalletFunding({
      quote: async () => errorOutcome,
      fundings,
      newId: () => "f1",
      now: () => NOW,
    })
    const result = await start({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(result).toBe(errorOutcome)
    expect(fundings.created).toHaveLength(0)
  })

  it("EGP -> INSTAPAY with fake_instapay_fund_<id> ref, PENDING row, redirect URL", async () => {
    const fundings = createFundings()
    const start = createStartWalletFunding({
      quote: async () => quoteOk(),
      fundings,
      newId: () => "f1",
      now: () => NOW,
    })
    const result = await start({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
    expect(result).toEqual({
      ok: true,
      funding: pendingFunding({ createdAt: NOW }),
      redirectUrl: "/checkout/fake/fake_instapay_fund_f1",
    })
    expect(fundings.created).toHaveLength(1)
    expect(fundings.created[0]).toEqual(pendingFunding({ createdAt: NOW }))
    expect(fundings.created[0].status).toBe("PENDING")
    expect(fundings.created[0].depositId).toBeNull()
  })

  it("USD -> CRYPTO with fake_crypto_fund_<id> ref", async () => {
    const fundings = createFundings()
    const start = createStartWalletFunding({
      quote: async () => quoteOk({ currency: "USD", amountMinor: 200, rateMinor: 100, egpValueMinor: 9700 }),
      fundings,
      newId: () => "f9",
      now: () => NOW,
    })
    const result = await start({ clientId: "c1", currency: "USD", amountMinor: 200 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.funding.provider).toBe("CRYPTO")
      expect(result.funding.providerReference).toBe("fake_crypto_fund_f9")
      expect(result.redirectUrl).toBe("/checkout/fake/fake_crypto_fund_f9")
      expect(result.funding.currency).toBe("USD")
      expect(result.funding.amountMinor).toBe(200)
      expect(result.funding.rateMinor).toBe(100)
      expect(result.funding.coins).toBe(2)
      expect(result.funding.wacEgpMinor).toBe(5000)
      expect(result.funding.egpValueMinor).toBe(9700)
    }
  })
})

describe("settleWalletFunding", () => {
  it("not found", async () => {
    const fundings = createFundings()
    const deposits = createDeposits()
    const wallets = createWallets()
    const settle = createSettleWalletFunding({
      fundings,
      deposits,
      wallets,
      newId: () => "d1",
      now: () => NOW,
    })
    expect(await settle({ providerReference: "missing" })).toEqual({ ok: false, error: "not_found" })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })

  it("PAID returns alreadySettled with no append/credit", async () => {
    const paid = pendingFunding({ status: "PAID", paidAt: NOW, depositId: "d-old" })
    const fundings = createFundings([paid])
    const deposits = createDeposits()
    const wallets = createWallets()
    const settle = createSettleWalletFunding({
      fundings,
      deposits,
      wallets,
      newId: () => "d1",
      now: () => NOW,
    })
    const result = await settle({ providerReference: paid.providerReference })
    expect(result).toEqual({ ok: true, funding: paid, depositId: "d-old", alreadySettled: true })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
    expect(fundings.markPaidCalls).toHaveLength(0)
    expect(fundings.attachCalls).toHaveLength(0)
  })

  it("FAILED -> not_pending", async () => {
    const failed = pendingFunding({ status: "FAILED" })
    const fundings = createFundings([failed])
    const deposits = createDeposits()
    const wallets = createWallets()
    const settle = createSettleWalletFunding({
      fundings,
      deposits,
      wallets,
      newId: () => "d1",
      now: () => NOW,
    })
    expect(await settle({ providerReference: failed.providerReference })).toEqual({
      ok: false,
      error: "not_pending",
    })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })

  it("EXPIRED -> not_pending", async () => {
    const expired = pendingFunding({ status: "EXPIRED" })
    const fundings = createFundings([expired])
    const deposits = createDeposits()
    const wallets = createWallets()
    const settle = createSettleWalletFunding({
      fundings,
      deposits,
      wallets,
      newId: () => "d1",
      now: () => NOW,
    })
    expect(await settle({ providerReference: expired.providerReference })).toEqual({
      ok: false,
      error: "not_pending",
    })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })

  it("PENDING -> markPaid, append one deposit with stored quote fields, credit deposit:<id>, attachDeposit, returns PAID", async () => {
    const pending = pendingFunding()
    const fundings = createFundings([pending])
    const deposits = createDeposits()
    const wallets = createWallets()
    const settle = createSettleWalletFunding({
      fundings,
      deposits,
      wallets,
      newId: () => "d1",
      now: () => NOW,
    })
    const result = await settle({ providerReference: pending.providerReference })
    expect(fundings.markPaidCalls).toEqual([{ id: "f1", paidAt: NOW }])
    expect(deposits.items).toEqual([
      {
        id: "d1",
        clientId: "c1",
        currency: "EGP",
        amountMinor: 10000,
        rateMinor: 5000,
        coins: 2,
        wacEgpMinor: 5000,
        egpValueMinor: 10000,
        createdAt: NOW,
      },
    ])
    expect(wallets.credits).toEqual([{ clientId: "c1", amount: 2, reason: "deposit:d1" }])
    expect(fundings.attachCalls).toEqual([{ id: "f1", depositId: "d1" }])
    expect(result).toEqual({
      ok: true,
      funding: { ...pending, status: "PAID", paidAt: NOW, depositId: "d1" },
      depositId: "d1",
      alreadySettled: false,
    })
  })

  it("markPaid false + still PENDING -> not_pending", async () => {
    const pending = pendingFunding()
    const fundings = createFundings([pending])
    fundings.markPaid = async () => false
    const deposits = createDeposits()
    const wallets = createWallets()
    const settle = createSettleWalletFunding({
      fundings,
      deposits,
      wallets,
      newId: () => "d1",
      now: () => NOW,
    })
    expect(await settle({ providerReference: pending.providerReference })).toEqual({
      ok: false,
      error: "not_pending",
    })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })

  it("markPaid false + now PAID -> alreadySettled", async () => {
    const pending = pendingFunding()
    const fundings = createFundings([pending])
    const paidReread = pendingFunding({ status: "PAID", paidAt: NOW, depositId: "d-race" })
    let findCalls = 0
    const originalFind = fundings.findByReference
    fundings.findByReference = async (ref: string) => {
      findCalls++
      if (findCalls === 1) return originalFind(ref)
      return paidReread
    }
    fundings.markPaid = vi.fn(async () => false)
    const deposits = createDeposits()
    const wallets = createWallets()
    const settle = createSettleWalletFunding({
      fundings,
      deposits,
      wallets,
      newId: () => "d1",
      now: () => NOW,
    })
    const result = await settle({ providerReference: pending.providerReference })
    expect(result).toEqual({ ok: true, funding: paidReread, depositId: "d-race", alreadySettled: true })
    expect(deposits.items).toHaveLength(0)
    expect(wallets.credits).toHaveLength(0)
  })
})
