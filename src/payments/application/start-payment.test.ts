import { describe, expect, it } from "vitest"
import { money } from "@/shared/money"
import { order, apply } from "@/ordering"
import { client } from "@/accounts"
import { product } from '@/catalogue'
import { player } from "@/ordering"
import { createStartPayment } from "./start-payment"
import { PaymentProvider } from "../ports/payment-provider"
import { PaymentRepository } from "../ports/payment-repository"
import { payment } from "../domain/payment"
import { PaymentError } from "../domain/payment-error"

function makeOrder() {
  const c = client("c1")
  const pr = product({ id: "pr1", distributorId: "d1", name: "Coins", cost: money(12000, "USD"), game: "mlbb" })
  const pl = player("u1", "s1")
  let o = order({
    id: "o1",
    token: "t1",
    profileId: "p1",
    client: c,
    product: pr,
    player: pl,
    price: money(12000, "USD"),
    markupBasisPoints: 0,
  })
  o = apply(o, "REQUEST_PAYMENT")
  return o
}

describe("start-payment", () => {
  it("calls charge with the order id, price and returnUrl", async () => {
    const o = makeOrder()
    const chargeCalls: any[] = []
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async (req) => {
        chargeCalls.push(req)
        return { providerReference: "ref123", redirectUrl: "/r/123" }
      },
      verify: async () => "PAID",
    }
    const saved: any[] = []
    const repo: PaymentRepository = {
      save: async (p) => {
        saved.push(p)
      },
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    await start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })
    expect(chargeCalls[0].orderId).toBe("o1")
    expect(chargeCalls[0].amount).toEqual(money(12000, "USD"))
    expect(chargeCalls[0].returnUrl).toBe("https://x/y")
  })

  it("saves a PENDING payment carrying the provider reference and the order price", async () => {
    const o = makeOrder()
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async () => ({ providerReference: "ref123", redirectUrl: "/r/123" }),
      verify: async () => "PAID",
    }
    const saved: any[] = []
    const repo: PaymentRepository = {
      save: async (p) => {
        saved.push(p)
      },
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    await start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })
    expect(saved.length).toBe(1)
    expect(saved[0].status).toBe("PENDING")
    expect(saved[0].providerReference).toBe("ref123")
    expect(saved[0].amount).toEqual(money(12000, "USD"))
  })

  it("returns the provider redirect url", async () => {
    const o = makeOrder()
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async () => ({ providerReference: "ref123", redirectUrl: "/r/123" }),
      verify: async () => "PAID",
    }
    const repo: PaymentRepository = {
      save: async () => {},
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    const res = await start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })
    expect(res.redirectUrl).toBe("/r/123")
  })

  it("throws PaymentError when the order is CREATED (build it with order(...)), and saves nothing", async () => {
    const c = client("c1")
    const pr = product({ id: "pr1", distributorId: "d1", name: "Coins", cost: money(12000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    const o = order({
      id: "o1",
      token: "t1",
      profileId: "p1",
      client: c,
      product: pr,
      player: pl,
      price: money(12000, "USD"),
      markupBasisPoints: 0,
    })
    const saved: any[] = []
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async () => ({ providerReference: "ref123", redirectUrl: "/r/123" }),
      verify: async () => "PAID",
    }
    const repo: PaymentRepository = {
      save: async (p) => {
        saved.push(p)
      },
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    await expect(start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })).rejects.toBeInstanceOf(PaymentError)
    expect(saved.length).toBe(0)
  })

  it("throws PaymentError when the order is PAID", async () => {
    const c = client("c1")
    const pr = product({ id: "pr1", distributorId: "d1", name: "Coins", cost: money(12000, "USD"), game: "mlbb" })
    const pl = player("u1", "s1")
    let o = order({
      id: "o1",
      token: "t1",
      profileId: "p1",
      client: c,
      product: pr,
      player: pl,
      price: money(12000, "USD"),
      markupBasisPoints: 0,
    })
    o = apply(o, "REQUEST_PAYMENT")
    o = apply(o, "PAYMENT_CONFIRMED")
    const saved: any[] = []
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async () => ({ providerReference: "ref123", redirectUrl: "/r/123" }),
      verify: async () => "PAID",
    }
    const repo: PaymentRepository = {
      save: async (p) => {
        saved.push(p)
      },
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    await expect(start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })).rejects.toBeInstanceOf(PaymentError)
    expect(saved.length).toBe(0)
  })

  it("returns an existing PENDING payment without charging or saving again", async () => {
    const o = makeOrder()
    const pending = payment({
      id: "p-existing",
      orderId: o.id,
      provider: "PAYMOB",
      providerReference: "fake_paymob_existing",
      amount: money(12000, "USD"),
      status: "PENDING",
    })
    const chargeCalls: any[] = []
    const saved: any[] = []
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async (req) => {
        chargeCalls.push(req)
        return { providerReference: "ref123", redirectUrl: "/r/123" }
      },
      verify: async () => "PAID",
    }
    const repo: PaymentRepository = {
      save: async (p) => {
        saved.push(p)
      },
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [pending],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    const res = await start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })
    expect(res.payment).toBe(pending)
    expect(res.redirectUrl).toBe("/checkout/fake/fake_paymob_existing")
    expect(chargeCalls.length).toBe(0)
    expect(saved.length).toBe(0)
  })

  it("throws PaymentError when an existing payment is PAID", async () => {
    const o = makeOrder()
    const paid = payment({
      id: "p-paid",
      orderId: o.id,
      provider: "PAYMOB",
      providerReference: "fake_paymob_paid",
      amount: money(12000, "USD"),
      status: "PAID",
    })
    const chargeCalls: any[] = []
    const saved: any[] = []
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async (req) => {
        chargeCalls.push(req)
        return { providerReference: "ref123", redirectUrl: "/r/123" }
      },
      verify: async () => "PAID",
    }
    const repo: PaymentRepository = {
      save: async (p) => {
        saved.push(p)
      },
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [paid],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    await expect(start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })).rejects.toThrow("Order already has a paid payment")
    expect(chargeCalls.length).toBe(0)
    expect(saved.length).toBe(0)
  })

  it("a rejecting charge propagates and saves nothing", async () => {
    const o = makeOrder()
    const provider: PaymentProvider = {
      name: "PAYMOB",
      charge: async () => {
        throw new Error("fail")
      },
      verify: async () => "PAID",
    }
    const saved: any[] = []
    const repo: PaymentRepository = {
      save: async (p) => {
        saved.push(p)
      },
      saveIfAbsent: async () => true,
      findByProviderReference: async () => null,
      findByOrderId: async () => [],
      markStatus: async () => {},
    }
    const start = createStartPayment({
      providers: { PAYMOB: provider, CRYPTO: provider, COINS: provider },
      payments: repo,
      newId: () => "p1",
    })
    await expect(start({ order: o, provider: "PAYMOB", returnUrl: "https://x/y" })).rejects.toThrow("fail")
    expect(saved.length).toBe(0)
  })
})
