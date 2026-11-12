import { describe, expect, it, vi } from "vitest"
import type { Container } from "@/container"
import { client } from "@/accounts"
import { product } from '@/catalogue'
import { order } from "@/ordering"
import { player } from "@/ordering"
import { payment } from "@/payments"
import { walletFunding } from "@/treasury"
import { money } from "@/shared/money"
import { confirmFakePayment, paymentProviderFor, readFakePayment } from "./payments"

const paymob = payment({
  id: "p1",
  orderId: "o1",
  provider: "PAYMOB",
  providerReference: "fake_paymob_o1",
  amount: money(1000, "USD"),
  status: "PENDING",
})

const crypto = payment({
  id: "p2",
  orderId: "o2",
  provider: "CRYPTO",
  providerReference: "fake_crypto_o2",
  amount: money(2000, "USD"),
  status: "PENDING",
})

const paidOrder = order({
  id: "o1",
  token: "t1",
  profileId: "p1",
  client: client("c1"),
  product: product({ id: "p", distributorId: "d", name: "86", cost: money(1000, "USD"), game: "mlbb" }),
  player: player("1", "2"),
  price: money(1000, "USD"),
  status: "PAID",
  markupBasisPoints: 0,
})

const cryptoOrder = order({
  id: "o2",
  token: "t2",
  profileId: "p1",
  client: client("c1"),
  product: product({ id: "p", distributorId: "d", name: "86", cost: money(2000, "USD"), game: "mlbb" }),
  player: player("1", "2"),
  price: money(2000, "USD"),
  status: "PAID",
  markupBasisPoints: 0,
})

const funding = walletFunding({
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
})

function nullPayments() {
  return {
    findByProviderReference: async () => null,
    findByOrderId: async () => [],
    save: async () => {},
    saveIfAbsent: async () => true,
    markStatus: async () => {},
  }
}

function nullFundings() {
  return {
    findByReference: async () => null,
    create: async () => {},
    markPaid: async () => false,
    attachDeposit: async () => {},
  }
}

type TestOverrides = Omit<Partial<Container>, "orders" | "walletFundings"> & {
  orders?: Partial<Container["orders"]>
  walletFundings?: Partial<Container["walletFundings"]>
}

function fakeContainer(overrides: TestOverrides = {}): Container {
  return {
    payments: {
      findByProviderReference: async (provider: string) =>
        provider === "CRYPTO" ? crypto : provider === "PAYMOB" ? paymob : null,
      findByOrderId: async () => [],
      save: async () => {},
      saveIfAbsent: async () => true,
      markStatus: async () => {},
    },
    orders: {
      findById: async (id: string) => (id === "o2" ? cryptoOrder : id === "o1" ? paidOrder : null),
    },
    walletFundings: {
      findByReference: async (reference: string) =>
        reference === "fake_paymob_fund_f1" ? funding : null,
    },
    confirmPayment: async () => paidOrder,
    fulfilOrder: async () => {},
    settleWalletFunding: async () => ({ ok: true as const, funding, depositId: null, alreadySettled: false }),
    ...overrides,
  } as unknown as Container
}

describe("paymentProviderFor", () => {
  it("infers the provider from the fake reference prefix", () => {
    expect(paymentProviderFor("fake_crypto_o2")).toBe("CRYPTO")
    expect(paymentProviderFor("fake_paymob_o1")).toBe("PAYMOB")
    expect(paymentProviderFor("anything_else")).toBe("PAYMOB")
  })

  it("infers the provider for wallet funding references", () => {
    expect(paymentProviderFor("fake_crypto_fund_f9")).toBe("CRYPTO")
    expect(paymentProviderFor("fake_paymob_fund_f1")).toBe("PAYMOB")
  })
})

describe("readFakePayment", () => {
  it("returns purpose order with amount/provider and returnUrl /order/<token>", async () => {
    expect(await readFakePayment(fakeContainer(), "fake_crypto_o2")).toEqual({
      amount: money(2000, "USD"),
      provider: "CRYPTO",
      purpose: "order",
      returnUrl: "/order/t2",
    })
  })

  it("returns purpose order for a paymob order payment", async () => {
    expect(await readFakePayment(fakeContainer(), "fake_paymob_o1")).toEqual({
      amount: money(1000, "USD"),
      provider: "PAYMOB",
      purpose: "order",
      returnUrl: "/order/t1",
    })
  })

  it("returns returnUrl / when the order row is missing", async () => {
    const container = fakeContainer({
      orders: { findById: async () => null },
    })
    expect(await readFakePayment(container, "fake_paymob_o1")).toEqual({
      amount: money(1000, "USD"),
      provider: "PAYMOB",
      purpose: "order",
      returnUrl: "/",
    })
  })

  it("returns purpose funding with money amount, funding provider and account returnUrl", async () => {
    const container = fakeContainer({ payments: nullPayments() })
    expect(await readFakePayment(container, "fake_paymob_fund_f1")).toEqual({
      amount: money(10000, "EGP"),
      provider: "PAYMOB",
      purpose: "funding",
      returnUrl: "/account?tab=wallet&funded=1",
    })
  })

  it("returns null when neither an order payment nor a funding exists", async () => {
    const container = fakeContainer({ payments: nullPayments(), walletFundings: nullFundings() })
    expect(await readFakePayment(container, "missing")).toBeNull()
  })
})

describe("confirmFakePayment", () => {
  it("settles a wallet funding exactly once without confirming or fulfilling an order", async () => {
    const settleWalletFunding = vi.fn(async () => ({ ok: true as const, funding, depositId: null, alreadySettled: false }))
    const confirmPayment = vi.fn(async () => paidOrder)
    const fulfilOrder = vi.fn(async (value: typeof paidOrder) => value)

    const result = await confirmFakePayment(
      fakeContainer({
        payments: nullPayments(),
        settleWalletFunding,
        confirmPayment,
        fulfilOrder,
      }),
      "fake_paymob_fund_f1",
      true,
    )

    expect(result).toEqual({ ok: true, redirectUrl: "/account?tab=wallet&funded=1" })
    expect(settleWalletFunding).toHaveBeenCalledTimes(1)
    expect(settleWalletFunding).toHaveBeenCalledWith({ providerReference: "fake_paymob_fund_f1" })
    expect(confirmPayment).not.toHaveBeenCalled()
    expect(fulfilOrder).not.toHaveBeenCalled()
  })

  it("returns ok false when wallet settlement fails", async () => {
    const settleWalletFunding = vi.fn(async () => ({ ok: false as const, error: "not_pending" as const }))
    const result = await confirmFakePayment(
      fakeContainer({ payments: nullPayments(), settleWalletFunding }),
      "fake_paymob_fund_f1",
      true,
    )

    expect(result).toEqual({ ok: false, redirectUrl: null })
    expect(settleWalletFunding).toHaveBeenCalledTimes(1)
  })

  it("confirms an order payment, fulfils when allowed and returns the order redirect", async () => {
    const confirmPayment = vi.fn(async () => paidOrder)
    const fulfilOrder = vi.fn(async (value: typeof paidOrder) => value)

    const result = await confirmFakePayment(
      fakeContainer({ confirmPayment, fulfilOrder }),
      "fake_paymob_o1",
      true,
    )

    expect(result).toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(confirmPayment).toHaveBeenCalledWith({ provider: "PAYMOB", reference: "fake_paymob_o1", status: "PAID" })
    expect(fulfilOrder).toHaveBeenCalledWith(paidOrder)
  })

  it("does not fulfil when fake fulfilment is disabled", async () => {
    const fulfilOrder = vi.fn(async (value: typeof paidOrder) => value)
    const result = await confirmFakePayment(fakeContainer({ fulfilOrder }), "fake_paymob_o1", false)

    expect(result).toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(fulfilOrder).not.toHaveBeenCalled()
  })

  it("does not fulfil when the confirmed order is not PAID", async () => {
    const awaiting = order({
      id: "o1",
      token: "t1",
      profileId: "p1",
      client: client("c1"),
      product: product({ id: "p", distributorId: "d", name: "86", cost: money(1000, "USD"), game: "mlbb" }),
      player: player("1", "2"),
      price: money(1000, "USD"),
      status: "AWAITING_PAYMENT",
      markupBasisPoints: 0,
    })
    const confirmPayment = vi.fn(async () => awaiting)
    const fulfilOrder = vi.fn(async (value: typeof awaiting) => value)

    const result = await confirmFakePayment(fakeContainer({ confirmPayment, fulfilOrder }), "fake_paymob_o1", true)

    expect(result).toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(fulfilOrder).not.toHaveBeenCalled()
  })

  it("returns ok false when there is no fake payment view", async () => {
    const settleWalletFunding = vi.fn(async () => ({ ok: true as const, funding, depositId: null, alreadySettled: false }))
    const confirmPayment = vi.fn(async () => paidOrder)
    const fulfilOrder = vi.fn(async (value: typeof paidOrder) => value)

    const result = await confirmFakePayment(
      fakeContainer({
        payments: nullPayments(),
        walletFundings: nullFundings(),
        settleWalletFunding,
        confirmPayment,
        fulfilOrder,
      }),
      "missing",
      true,
    )

    expect(result).toEqual({ ok: false, redirectUrl: null })
    expect(settleWalletFunding).not.toHaveBeenCalled()
    expect(confirmPayment).not.toHaveBeenCalled()
    expect(fulfilOrder).not.toHaveBeenCalled()
  })

  it("returns ok false when confirmPayment returns null", async () => {
    const confirmPayment = vi.fn(async () => null)
    const fulfilOrder = vi.fn(async (value: typeof paidOrder) => value)

    const result = await confirmFakePayment(
      fakeContainer({ confirmPayment, fulfilOrder }),
      "fake_paymob_o1",
      true,
    )

    expect(result).toEqual({ ok: false, redirectUrl: null })
    expect(fulfilOrder).not.toHaveBeenCalled()
  })
})
