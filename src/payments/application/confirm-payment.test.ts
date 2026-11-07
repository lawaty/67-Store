import { describe, expect, it } from "vitest"
import { createConfirmPayment } from "./confirm-payment"
import { Payment, PaymentProviderName, PaymentStatus } from "../domain/payment"
import { PaymentRepository } from "../ports/payment-repository"
import { OrderRepository } from "@/ordering"
import { Order, order } from "@/ordering"
import { Client } from "@/accounts"
import { Product } from '@/catalogue'
import { Player } from "@/ordering"
import { money } from "@/shared/money"

function makeClient(): Client {
  return { id: "c1" }
}

function makeProduct(): Product {
  return { id: "p1", distributorId: "D1", name: "Coins", cost: money(10, "USD"), game: "game" }
}

function makePlayer(): Player {
  return { userId: "u1", serverId: "s1" }
}

class InMemoryPayments implements PaymentRepository {
  payments = new Map<string, Payment>()
  markStatusCalls: Array<{ provider: PaymentProviderName; reference: string; status: PaymentStatus }> = []

  key(provider: PaymentProviderName, reference: string) {
    return `${provider}:${reference}`
  }

  async save(p: Payment): Promise<void> {
    this.payments.set(this.key(p.provider, p.providerReference), p)
  }

  async findByProviderReference(provider: PaymentProviderName, reference: string): Promise<Payment | null> {
    return this.payments.get(this.key(provider, reference)) ?? null
  }

  async markStatus(provider: PaymentProviderName, reference: string, status: PaymentStatus): Promise<void> {
    this.markStatusCalls.push({ provider, reference, status })
    const k = this.key(provider, reference)
    const existing = this.payments.get(k)
    if (existing) {
      const updated = Object.freeze({ ...existing, status })
      this.payments.set(k, updated)
    }
  }
}

class InMemoryOrders implements OrderRepository {
  orders = new Map<string, Order>()
  updateCalls: Order[] = []

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order)
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null
  }

  async findByToken(token: string): Promise<Order | null> {
    for (const o of this.orders.values()) {
      if (o.token === token) return o
    }
    return null
  }

  async update(order: Order): Promise<void> {
    this.updateCalls.push(order)
    this.orders.set(order.id, order)
  }

  async listRecent(): Promise<Order[]> {
    return []
  }
  async listByClient(): Promise<Order[]> {
    return []
  }

  async findByDistributorOrderId(): Promise<Order | null> {
    return null
  }
  async listByStatus(): Promise<Order[]> {
    return []
  }
  async search(): Promise<{ rows: Order[]; total: number }> {
    return { rows: [], total: 0 }
  }
  async sumCoinsChargedSince(): Promise<number> {
    return 0
  }
}

describe("createConfirmPayment", () => {
  it("marks the payment PAID", async () => {
    const payments = new InMemoryPayments()
    const orders = new InMemoryOrders()
    const p = Object.freeze({
      id: "pay1",
      orderId: "ord1",
      provider: "INSTAPAY" as PaymentProviderName,
      providerReference: "ref1",
      amount: money(10, "USD"),
      status: "PENDING" as PaymentStatus,
    })
    await payments.save(p)
    const confirm = createConfirmPayment({ payments, orders })
    const res = await confirm({ provider: "INSTAPAY", reference: "ref1", status: "PAID" })
    expect(res).toBeNull()
    expect(payments.markStatusCalls.length).toBe(1)
  })

  it("moves an AWAITING_PAYMENT order to PAID and stores the provider reference", async () => {
    const payments = new InMemoryPayments()
    const orders = new InMemoryOrders()
    const p = Object.freeze({
      id: "pay1",
      orderId: "ord1",
      provider: "INSTAPAY" as PaymentProviderName,
      providerReference: "ref1",
      amount: money(10, "USD"),
      status: "PENDING" as PaymentStatus,
    })
    await payments.save(p)
    let o = order({ id: "ord1", token: "t1", client: makeClient(), product: makeProduct(), player: makePlayer(), price: money(10, "USD") ,
    markupBasisPoints: 0,
  })
    const { apply } = await import('@/ordering')
    o = apply(o, "REQUEST_PAYMENT")
    await orders.save(o)
    const confirm = createConfirmPayment({ payments, orders })
    const res = await confirm({ provider: "INSTAPAY", reference: "ref1", status: "PAID" })
    expect(res?.status).toBe("PAID")
    expect(res?.paymentReference).toBe("ref1")
    expect(orders.updateCalls.length).toBe(1)
  })

  it("unknown reference returns null and writes nothing", async () => {
    const payments = new InMemoryPayments()
    const orders = new InMemoryOrders()
    const confirm = createConfirmPayment({ payments, orders })
    const res = await confirm({ provider: "INSTAPAY", reference: "missing", status: "PAID" })
    expect(res).toBeNull()
    expect(payments.markStatusCalls.length).toBe(0)
    expect(orders.updateCalls.length).toBe(0)
  })

  it("an already-PAID payment returns null and does not touch the order", async () => {
    const payments = new InMemoryPayments()
    const orders = new InMemoryOrders()
    const p = Object.freeze({
      id: "pay1",
      orderId: "ord1",
      provider: "INSTAPAY" as PaymentProviderName,
      providerReference: "ref1",
      amount: money(10, "USD"),
      status: "PAID" as PaymentStatus,
    })
    await payments.save(p)
    const confirm = createConfirmPayment({ payments, orders })
    const res = await confirm({ provider: "INSTAPAY", reference: "ref1", status: "PAID" })
    expect(res).toBeNull()
    expect(payments.markStatusCalls.length).toBe(0)
    expect(orders.updateCalls.length).toBe(0)
  })

  it("a payment whose order is already PAID returns that order unchanged and does not update it", async () => {
    const payments = new InMemoryPayments()
    const orders = new InMemoryOrders()
    const p = Object.freeze({
      id: "pay1",
      orderId: "ord1",
      provider: "INSTAPAY" as PaymentProviderName,
      providerReference: "ref1",
      amount: money(10, "USD"),
      status: "PENDING" as PaymentStatus,
    })
    await payments.save(p)
    let o = order({ id: "ord1", token: "t1", client: makeClient(), product: makeProduct(), player: makePlayer(), price: money(10, "USD") ,
    markupBasisPoints: 0,
  })
    const { apply } = await import('@/ordering')
    o = apply(o, "REQUEST_PAYMENT")
    o = apply(o, "PAYMENT_CONFIRMED")
    await orders.save(o)
    const confirm = createConfirmPayment({ payments, orders })
    const res = await confirm({ provider: "INSTAPAY", reference: "ref1", status: "PAID" })
    expect(res?.id).toBe("ord1")
    expect(res?.status).toBe("PAID")
    expect(orders.updateCalls.length).toBe(0)
  })

  it("a non-PAID status marks the payment and does not touch the order", async () => {
    const payments = new InMemoryPayments()
    const orders = new InMemoryOrders()
    const p = Object.freeze({
      id: "pay1",
      orderId: "ord1",
      provider: "INSTAPAY" as PaymentProviderName,
      providerReference: "ref1",
      amount: money(10, "USD"),
      status: "PENDING" as PaymentStatus,
    })
    await payments.save(p)
    let o = order({ id: "ord1", token: "t1", client: makeClient(), product: makeProduct(), player: makePlayer(), price: money(10, "USD") ,
    markupBasisPoints: 0,
  })
    const { apply } = await import('@/ordering')
    o = apply(o, "REQUEST_PAYMENT")
    await orders.save(o)
    const confirm = createConfirmPayment({ payments, orders })
    const res = await confirm({ provider: "INSTAPAY", reference: "ref1", status: "FAILED" })
    expect(res).toBeNull()
    expect(payments.markStatusCalls.length).toBe(1)
    expect(orders.updateCalls.length).toBe(0)
  })

  it("a missing order returns null", async () => {
    const payments = new InMemoryPayments()
    const orders = new InMemoryOrders()
    const p = Object.freeze({
      id: "pay1",
      orderId: "ord1",
      provider: "INSTAPAY" as PaymentProviderName,
      providerReference: "ref1",
      amount: money(10, "USD"),
      status: "PENDING" as PaymentStatus,
    })
    await payments.save(p)
    const confirm = createConfirmPayment({ payments, orders })
    const res = await confirm({ provider: "INSTAPAY", reference: "ref1", status: "PAID" })
    expect(res).toBeNull()
    expect(payments.markStatusCalls.length).toBe(1)
    expect(orders.updateCalls.length).toBe(0)
  })
})
