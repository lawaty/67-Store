import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { quoteWalletFunding, startWalletFunding } from "./wallet-funding"

function fakeContainer(overrides: Partial<Container> = {}): Container {
  return {
    quoteDeposit: vi.fn(async () => ({
      ok: true as const,
      quote: {
        currency: "EGP" as const,
        amountMinor: 10000,
        rateMinor: 50,
        coins: 200,
        wacEgpMinor: 4800,
        egpValueMinor: 10000,
        coinValueMinor: 10,
      },
    })),
    startWalletFunding: vi.fn(async () => ({
      ok: true as const,
      funding: {} as never,
      redirectUrl: "/checkout/fake/fake_paymob_fund_f1",
    })),
    ...overrides,
  } as unknown as Container
}

describe("quoteWalletFunding", () => {
  it.each([["EGP"], ["USD"]])("passes through %s quotes", async (currency) => {
    const quoteDeposit = vi.fn(async () => ({
      ok: true as const,
      quote: {
        currency: currency as "EGP" | "USD",
        amountMinor: 10000,
        rateMinor: 50,
        coins: 200,
        wacEgpMinor: 4800,
        egpValueMinor: 10000,
        coinValueMinor: 10,
      },
    }))
    const container = fakeContainer({ quoteDeposit: quoteDeposit as never })

    const result = await quoteWalletFunding(container, { currency, amountMinor: 10000 })

    expect(result).toEqual({
      ok: true,
      quote: { currency, amountMinor: 10000, rateMinor: 50, coins: 200, egpValueMinor: 10000 },
    })
    expect(quoteDeposit).toHaveBeenCalledWith({ currency, amountMinor: 10000 })
  })

  it.each(["SAR", "AED", "JOD"])("rejects %s as amount", async (currency) => {
    const quoteDeposit = vi.fn(async () => ({ ok: true as const, quote: {} as never }))
    const container = fakeContainer({ quoteDeposit: quoteDeposit as never })

    const result = await quoteWalletFunding(container, { currency, amountMinor: 10000 })

    expect(result).toEqual({ ok: false, error: "amount" })
    expect(quoteDeposit).not.toHaveBeenCalled()
  })

  it.each([0, -100, 100.5, "10000", null, undefined])("rejects invalid amount %s", async (amountMinor) => {
    const quoteDeposit = vi.fn(async () => ({ ok: true as const, quote: {} as never }))
    const container = fakeContainer({ quoteDeposit: quoteDeposit as never })

    const result = await quoteWalletFunding(container, { currency: "EGP", amountMinor })

    expect(result).toEqual({ ok: false, error: "amount" })
    expect(quoteDeposit).not.toHaveBeenCalled()
  })

  it("passes the treasury error through", async () => {
    const quoteDeposit = vi.fn(async () => ({ ok: false as const, error: "coverage" as const }))
    const container = fakeContainer({ quoteDeposit: quoteDeposit as never })

    const result = await quoteWalletFunding(container, { currency: "EGP", amountMinor: 10000 })

    expect(result).toEqual({ ok: false, error: "coverage" })
    expect(quoteDeposit).toHaveBeenCalledWith({ currency: "EGP", amountMinor: 10000 })
  })
})

describe("startWalletFunding", () => {
  it.each([["EGP"], ["USD"]])("starts a %s funding and returns the redirect", async (currency) => {
    const startWallet = vi.fn(async () => ({
      ok: true as const,
      funding: {} as never,
      redirectUrl: "/checkout/fake/fake_paymob_fund_f1",
    }))
    const container = fakeContainer({ startWalletFunding: startWallet as never })

    const result = await startWalletFunding(container, { clientId: "c1", currency, amountMinor: 10000 })

    expect(result).toEqual({ ok: true, redirectUrl: "/checkout/fake/fake_paymob_fund_f1" })
    expect(startWallet).toHaveBeenCalledWith({ clientId: "c1", currency, amountMinor: 10000 })
  })

  it.each(["SAR", "AED", "JOD"])("rejects %s as amount", async (currency) => {
    const startWallet = vi.fn(async () => ({ ok: true as const, funding: {} as never, redirectUrl: "/x" }))
    const container = fakeContainer({ startWalletFunding: startWallet as never })

    const result = await startWalletFunding(container, { clientId: "c1", currency, amountMinor: 10000 })

    expect(result).toEqual({ ok: false, error: "amount" })
    expect(startWallet).not.toHaveBeenCalled()
  })

  it.each([0, -100, 100.5, "10000", null, undefined])("rejects invalid amount %s", async (amountMinor) => {
    const startWallet = vi.fn(async () => ({ ok: true as const, funding: {} as never, redirectUrl: "/x" }))
    const container = fakeContainer({ startWalletFunding: startWallet as never })

    const result = await startWalletFunding(container, { clientId: "c1", currency: "EGP", amountMinor })

    expect(result).toEqual({ ok: false, error: "amount" })
    expect(startWallet).not.toHaveBeenCalled()
  })

  it("rejects an empty clientId without calling the container", async () => {
    const startWallet = vi.fn(async () => ({ ok: true as const, funding: {} as never, redirectUrl: "/x" }))
    const container = fakeContainer({ startWalletFunding: startWallet as never })

    const result = await startWalletFunding(container, { clientId: "", currency: "EGP", amountMinor: 10000 })

    expect(result).toEqual({ ok: false, error: "amount" })
    expect(startWallet).not.toHaveBeenCalled()
  })

  it("passes the treasury error through", async () => {
    const startWallet = vi.fn(async () => ({ ok: false as const, error: "rate" as const }))
    const container = fakeContainer({ startWalletFunding: startWallet as never })

    const result = await startWalletFunding(container, { clientId: "c1", currency: "EGP", amountMinor: 10000 })

    expect(result).toEqual({ ok: false, error: "rate" })
    expect(startWallet).toHaveBeenCalledWith({ clientId: "c1", currency: "EGP", amountMinor: 10000 })
  })
})
