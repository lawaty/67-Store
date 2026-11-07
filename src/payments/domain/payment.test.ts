import { describe, expect, it } from "vitest"
import { money } from "@/shared/money"
import { payment } from "./payment"

describe("payment", () => {
  it("builds a payment with every field", () => {
    const p = payment({
      id: "p1",
      orderId: "o1",
      provider: "INSTAPAY",
      providerReference: "ref1",
      amount: money(1000, "USD"),
      status: "PENDING",
    })
    expect(p.id).toBe("p1")
    expect(p.orderId).toBe("o1")
    expect(p.provider).toBe("INSTAPAY")
    expect(p.providerReference).toBe("ref1")
    expect(p.amount).toEqual(money(1000, "USD"))
    expect(p.status).toBe("PENDING")
  })

  it("trims the three strings", () => {
    const p = payment({
      id: " p1 ",
      orderId: " o1 ",
      provider: "CRYPTO",
      providerReference: " ref1 ",
      amount: money(500, "EGP"),
      status: "PAID",
    })
    expect(p.id).toBe("p1")
    expect(p.orderId).toBe("o1")
    expect(p.providerReference).toBe("ref1")
  })

  it("throws RangeError for a blank id, orderId and providerReference", () => {
    expect(() =>
      payment({
        id: "   ",
        orderId: "o1",
        provider: "INSTAPAY",
        providerReference: "ref1",
        amount: money(1, "USD"),
        status: "PENDING",
      })
    ).toThrow(RangeError)

    expect(() =>
      payment({
        id: "p1",
        orderId: "   ",
        provider: "INSTAPAY",
        providerReference: "ref1",
        amount: money(1, "USD"),
        status: "PENDING",
      })
    ).toThrow(RangeError)

    expect(() =>
      payment({
        id: "p1",
        orderId: "o1",
        provider: "INSTAPAY",
        providerReference: "   ",
        amount: money(1, "USD"),
        status: "PENDING",
      })
    ).toThrow(RangeError)
  })

  it("returns a frozen object", () => {
    const p = payment({
      id: "p1",
      orderId: "o1",
      provider: "INSTAPAY",
      providerReference: "ref1",
      amount: money(1000, "USD"),
      status: "PENDING",
    })
    expect(Object.isFrozen(p)).toBe(true)
  })
})
