import { describe, expect, it } from "vitest"
import { walletFunding, WalletFunding } from "./wallet-funding"

const base: WalletFunding = {
  id: "f1",
  clientId: "c1",
  currency: "EGP",
  amountMinor: 10000,
  rateMinor: 5000,
  coins: 2,
  wacEgpMinor: 5000,
  egpValueMinor: 10000,
  provider: "PAYMOB",
  providerReference: "fake_paymob_fund_f1",
  status: "PENDING",
  depositId: null,
  createdAt: "2026-11-07T00:00:00.000Z",
  paidAt: null,
}

describe("walletFunding", () => {
  it("valid fixture passes and returns the input unchanged", () => {
    const result = walletFunding(base)
    expect(result).toBe(base)
    expect(result).toEqual(base)
  })

  it("valid PAID fixture with paidAt and depositId passes", () => {
    const paid: WalletFunding = {
      ...base,
      status: "PAID",
      depositId: "d1",
      paidAt: "2026-11-07T01:00:00.000Z",
    }
    expect(walletFunding(paid)).toEqual(paid)
  })

  it("valid CRYPTO fixture passes", () => {
    const crypto: WalletFunding = { ...base, currency: "USD", provider: "CRYPTO" }
    expect(walletFunding(crypto)).toEqual(crypto)
  })

  it("empty ids throw", () => {
    expect(() => walletFunding({ ...base, id: "   " })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, clientId: "" })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, currency: "  " })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, providerReference: "" })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, depositId: "   " })).toThrow(RangeError)
  })

  it("non-positive amounts throw", () => {
    expect(() => walletFunding({ ...base, amountMinor: 0 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, amountMinor: -100 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, rateMinor: 0 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, rateMinor: -1 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, coins: 0 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, coins: -2 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, wacEgpMinor: -1 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, egpValueMinor: -1 })).toThrow(RangeError)
  })

  it("non-safe integers throw", () => {
    expect(() => walletFunding({ ...base, amountMinor: 100.5 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, rateMinor: NaN })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, coins: Number.MAX_SAFE_INTEGER + 1 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, wacEgpMinor: 1.5 })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, egpValueMinor: Number.POSITIVE_INFINITY })).toThrow(RangeError)
  })

  it("zero wacEgpMinor and egpValueMinor pass", () => {
    const zero: WalletFunding = { ...base, wacEgpMinor: 0, egpValueMinor: 0 }
    expect(walletFunding(zero)).toEqual(zero)
  })

  it("bad provider throws", () => {
    expect(() => walletFunding({ ...base, provider: "COINS" as any })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, provider: "FOO" as any })).toThrow(RangeError)
  })

  it("bad status throws", () => {
    expect(() => walletFunding({ ...base, status: "FOO" as any })).toThrow(RangeError)
  })

  it("each valid status passes", () => {
    expect(walletFunding({ ...base, status: "PENDING" })).toEqual({ ...base, status: "PENDING" })
    expect(walletFunding({ ...base, status: "FAILED" })).toEqual({ ...base, status: "FAILED" })
    expect(walletFunding({ ...base, status: "EXPIRED" })).toEqual({ ...base, status: "EXPIRED" })
    const paid: WalletFunding = { ...base, status: "PAID", paidAt: "2026-11-07T01:00:00.000Z" }
    expect(walletFunding(paid)).toEqual(paid)
  })

  it("PAID without paidAt throws", () => {
    expect(() => walletFunding({ ...base, status: "PAID", paidAt: null })).toThrow(RangeError)
  })

  it("invalid dates throw", () => {
    expect(() => walletFunding({ ...base, createdAt: "not-a-date" })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, createdAt: "" })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, paidAt: "nope" })).toThrow(RangeError)
    expect(() => walletFunding({ ...base, status: "PAID", paidAt: "2026-13-99" })).toThrow(RangeError)
  })
})
