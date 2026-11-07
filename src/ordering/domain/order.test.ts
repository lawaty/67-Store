import { describe, expect, test } from "vitest"
import fc from "fast-check"
import { money } from "../../shared/money"
import { product } from "@/catalogue"
import { player } from "./player"
import { client } from "@/accounts"
import { order, apply, attachPayment, attachDistributorOrder } from "./order"
import { InvalidTransition } from "./order-status"

function makeFixture() {
  const c = client("c1")
  const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
  const pl = player("u1", "s1")
  const price = money(10000, "USD")
  return { c, p, pl, price }
}

describe("order", () => {
  test("order(...) starts at CREATED with both references null.", () => {
    const { c, p, pl, price } = makeFixture()
    const o = order({ id: "o1", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
    expect(o.status).toBe("CREATED")
    expect(o.paymentReference).toBe(null)
    expect(o.distributorOrderId).toBe(null)
    expect(o.coinValueMinor).toBe(null)
  })

  test("order(...) throws RangeError for a blank id.", () => {
    const { c, p, pl, price } = makeFixture()
    expect(() => order({ id: "", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })).toThrow(RangeError)
    expect(() => order({ id: "   ", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })).toThrow(RangeError)
  })

  test("order(...) throws RangeError for a blank token.", () => {
    const { c, p, pl, price } = makeFixture()
    expect(() => order({ id: "o1", token: "", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })).toThrow(RangeError)
    expect(() => order({ id: "o1", token: "   ", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })).toThrow(RangeError)
  })

  test("The happy path: request payment, confirm payment, attach the payment reference, start fulfilment, attach the distributor order id, then delivery succeeded — each step returns the expected status and keeps the earlier fields.", () => {
    const { c, p, pl, price } = makeFixture()
    const o0 = order({ id: "o2", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
    expect(o0.id).toBe("o2")
    expect(o0.client).toBe(c)
    expect(o0.product).toBe(p)
    expect(o0.player).toBe(pl)
    expect(o0.price).toBe(price)

    const o1 = apply(o0, "REQUEST_PAYMENT")
    expect(o1.status).toBe("AWAITING_PAYMENT")
    expect(o1.paymentReference).toBe(null)
    expect(o1.distributorOrderId).toBe(null)
    expect(o1.id).toBe("o2")
    expect(o1.client).toBe(c)
    expect(o1.product).toBe(p)
    expect(o1.player).toBe(pl)
    expect(o1.price).toBe(price)

    const o2 = attachPayment(o1, "pay_123")
    expect(o2.status).toBe("AWAITING_PAYMENT")
    expect(o2.paymentReference).toBe("pay_123")
    expect(o2.distributorOrderId).toBe(null)

    const o3 = apply(o2, "PAYMENT_CONFIRMED")
    expect(o3.status).toBe("PAID")
    expect(o3.paymentReference).toBe("pay_123")
    expect(o3.distributorOrderId).toBe(null)

    const o4 = apply(o3, "FULFILMENT_STARTED")
    expect(o4.status).toBe("FULFILLING")
    expect(o4.paymentReference).toBe("pay_123")

    const o5 = attachDistributorOrder(o4, "dist_456")
    expect(o5.status).toBe("FULFILLING")
    expect(o5.paymentReference).toBe("pay_123")
    expect(o5.distributorOrderId).toBe("dist_456")

    const o6 = apply(o5, "DELIVERY_SUCCEEDED")
    expect(o6.status).toBe("DELIVERED")
    expect(o6.paymentReference).toBe("pay_123")
    expect(o6.distributorOrderId).toBe("dist_456")
    expect(o6.id).toBe("o2")
    expect(o6.client).toBe(c)
    expect(o6.product).toBe(p)
    expect(o6.player).toBe(pl)
    expect(o6.price).toBe(price)
  })

  test("apply never mutates its input: the original still has its old status after the call.", () => {
    const { c, p, pl, price } = makeFixture()
    const o0 = order({ id: "o3", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
    expect(o0.status).toBe("CREATED")
    const o1 = apply(o0, "REQUEST_PAYMENT")
    expect(o0.status).toBe("CREATED")
    expect(o1.status).toBe("AWAITING_PAYMENT")
  })

  test("attachPayment throws InvalidTransition when the order is CREATED or PAID.", () => {
    const { c, p, pl, price } = makeFixture()
    const oCreated = order({ id: "o4", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
    expect(() => attachPayment(oCreated, "ref")).toThrow(InvalidTransition)
    expect(() => attachPayment(oCreated, "ref")).toThrow("Cannot attach a payment to CREATED")

    const oPaid = apply(apply(oCreated, "REQUEST_PAYMENT"), "PAYMENT_CONFIRMED")
    expect(() => attachPayment(oPaid, "ref")).toThrow(InvalidTransition)
    expect(() => attachPayment(oPaid, "ref")).toThrow("Cannot attach a payment to PAID")
  })

  test("attachDistributorOrder throws InvalidTransition when the order is PAID or DELIVERED.", () => {
    const { c, p, pl, price } = makeFixture()
    const oCreated = order({ id: "o5", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
    const oPaid = apply(apply(oCreated, "REQUEST_PAYMENT"), "PAYMENT_CONFIRMED")
    expect(() => attachDistributorOrder(oPaid, "ref")).toThrow(InvalidTransition)
    expect(() => attachDistributorOrder(oPaid, "ref")).toThrow("Cannot attach a distributor order to PAID")

    const oFulfilled = apply(oPaid, "FULFILMENT_STARTED")
    const oDelivered = apply(attachDistributorOrder(oFulfilled, "d"), "DELIVERY_SUCCEEDED")
    expect(() => attachDistributorOrder(oDelivered, "ref")).toThrow(InvalidTransition)
    expect(() => attachDistributorOrder(oDelivered, "ref")).toThrow("Cannot attach a distributor order to DELIVERED")
  })

  test("attachPayment and attachDistributorOrder throw RangeError for a blank reference.", () => {
    const { c, p, pl, price } = makeFixture()
    const oAwaiting = apply(order({ id: "o6", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  }), "REQUEST_PAYMENT")
    expect(() => attachPayment(oAwaiting, "")).toThrow(RangeError)
    expect(() => attachPayment(oAwaiting, "   ")).toThrow(RangeError)

    const oPaid = apply(oAwaiting, "PAYMENT_CONFIRMED")
    const oFulfilling = apply(oPaid, "FULFILMENT_STARTED")
    expect(() => attachDistributorOrder(oFulfilling, "")).toThrow(RangeError)
    expect(() => attachDistributorOrder(oFulfilling, "   ")).toThrow(RangeError)
  })

  test("Every returned order is frozen.", () => {
    const { c, p, pl, price } = makeFixture()
    const o0 = order({ id: "o7", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
    expect(Object.isFrozen(o0)).toBe(true)
    const o1 = apply(o0, "REQUEST_PAYMENT")
    expect(Object.isFrozen(o1)).toBe(true)
    const o2 = attachPayment(o1, "ref")
    expect(Object.isFrozen(o2)).toBe(true)
    const o3 = apply(o2, "PAYMENT_CONFIRMED")
    expect(Object.isFrozen(o3)).toBe(true)
    const o4 = apply(o3, "FULFILMENT_STARTED")
    const o5 = attachDistributorOrder(o4, "dref")
    expect(Object.isFrozen(o5)).toBe(true)
  })

  test("order() defaults wacEgpMinor, cogsEgpMinor, tradingMarginMinor and coinValueMinor to null.", () => {
    const { c, p, pl, price } = makeFixture()
    const o = order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
    expect(o.wacEgpMinor).toBeNull()
    expect(o.cogsEgpMinor).toBeNull()
    expect(o.tradingMarginMinor).toBeNull()
    expect(o.coinValueMinor).toBeNull()
  })

  test("order() accepts a positive safe coinValueMinor and rejects null, zero, negative, non-integer and non-safe values.", () => {
    const { c, p, pl, price } = makeFixture()
    expect(order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, coinValueMinor: 100, markupBasisPoints: 0 }).coinValueMinor).toBe(100)
    expect(order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, coinValueMinor: null, markupBasisPoints: 0 }).coinValueMinor).toBeNull()
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, coinValueMinor: 0, markupBasisPoints: 0 })).toThrow(RangeError)
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, coinValueMinor: -1, markupBasisPoints: 0 })).toThrow(RangeError)
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, coinValueMinor: 1.5, markupBasisPoints: 0 })).toThrow(RangeError)
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, coinValueMinor: Number.NaN, markupBasisPoints: 0 })).toThrow(RangeError)
  })

  test("order() rejects a negative value for the snapshot fields.", () => {
    const { c, p, pl, price } = makeFixture()
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, wacEgpMinor: -1 ,
    markupBasisPoints: 0,
  })).toThrow(RangeError)
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, cogsEgpMinor: -1 ,
    markupBasisPoints: 0,
  })).toThrow(RangeError)
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, tradingMarginMinor: -1 ,
    markupBasisPoints: 0,
  })).toThrow(RangeError)
  })

  test("order() rejects a negative or non-integer markupBasisPoints.", () => {
    const { c, p, pl, price } = makeFixture()
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, markupBasisPoints: -1 })).toThrow(RangeError)
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, markupBasisPoints: 1.5 })).toThrow(RangeError)
    expect(() => order({ id: "oX", token: "tok_1", client: c, product: p, player: pl, price, markupBasisPoints: NaN as unknown as number })).toThrow(RangeError)
  })

  test("markupBasisPoints is preserved through transitions and attachments; historical reads may be null.", () => {
    const { c, p, pl, price } = makeFixture()
    const o0 = order({ id: "oM", token: "tok_m", client: c, product: p, player: pl, price, markupBasisPoints: 1500 })
    expect(o0.markupBasisPoints).toBe(1500)
    const o1 = attachPayment(apply(o0, "REQUEST_PAYMENT"), "pay_m")
    expect(o1.markupBasisPoints).toBe(1500)
    const o2 = apply(o1, "PAYMENT_CONFIRMED")
    const o3 = attachDistributorOrder(apply(o2, "FULFILMENT_STARTED"), "dist_m")
    expect(o3.markupBasisPoints).toBe(1500)
    const o4 = apply(o3, "DELIVERY_SUCCEEDED")
    expect(o4.markupBasisPoints).toBe(1500)
    const legacy = order({ id: "oL", token: "tok_l", client: c, product: p, player: pl, price, markupBasisPoints: null })
    expect(legacy.markupBasisPoints).toBeNull()
  })

  test("coinValueMinor is preserved through transitions and attachments; legacy orders remain null.", () => {
    const { c, p, pl, price } = makeFixture()
    const o0 = order({ id: "oC", token: "tok_c", client: c, product: p, player: pl, price, coinValueMinor: 100, markupBasisPoints: 1500 })
    expect(o0.coinValueMinor).toBe(100)
    const o1 = attachPayment(apply(o0, "REQUEST_PAYMENT"), "pay_c")
    expect(o1.coinValueMinor).toBe(100)
    const o2 = apply(o1, "PAYMENT_CONFIRMED")
    const o3 = attachDistributorOrder(apply(o2, "FULFILMENT_STARTED"), "dist_c")
    expect(o3.coinValueMinor).toBe(100)
    const o4 = apply(o3, "DELIVERY_SUCCEEDED")
    expect(o4.coinValueMinor).toBe(100)
    const legacy = order({ id: "oCL", token: "tok_cl", client: c, product: p, player: pl, price, markupBasisPoints: 0 })
    expect(legacy.coinValueMinor).toBeNull()
  })

  test("Property: apply with REQUEST_PAYMENT on a CREATED order always yields AWAITING_PAYMENT and preserves id, client, product, player and price by reference.", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), (sid) => {
        const c = client("c1")
        const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(10000, "USD"), game: "mlbb" })
        const pl = player("u1", "s1")
        const price = money(10000, "USD")
        const o = order({ id: sid, token: "tok_1", client: c, product: p, player: pl, price ,
    markupBasisPoints: 0,
  })
        const o2 = apply(o, "REQUEST_PAYMENT")
        expect(o2.status).toBe("AWAITING_PAYMENT")
        expect(o2.id).toBe(o.id)
        expect(o2.client).toBe(o.client)
        expect(o2.product).toBe(o.product)
        expect(o2.player).toBe(o.player)
        expect(o2.price).toBe(o.price)
      })
    )
  })
})
