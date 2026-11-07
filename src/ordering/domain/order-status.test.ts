import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import { InvalidTransition, transition, type OrderEvent, type OrderStatus } from "./order-status"

const STATUSES: OrderStatus[] = [
  "CREATED",
  "AWAITING_PAYMENT",
  "PAID",
  "FULFILLING",
  "DELIVERED",
  "FAILED",
  "EXPIRED",
  "REFUNDED",
]

const EVENTS: OrderEvent[] = [
  "REQUEST_PAYMENT",
  "PAYMENT_CONFIRMED",
  "PAYMENT_EXPIRED",
  "FULFILMENT_STARTED",
  "DELIVERY_SUCCEEDED",
  "DELIVERY_FAILED",
  "REFUNDED",
]

const VALID_PAIRS: Array<[OrderStatus, OrderEvent, OrderStatus]> = [
  ["CREATED", "REQUEST_PAYMENT", "AWAITING_PAYMENT"],
  ["AWAITING_PAYMENT", "PAYMENT_CONFIRMED", "PAID"],
  ["AWAITING_PAYMENT", "PAYMENT_EXPIRED", "EXPIRED"],
  ["PAID", "FULFILMENT_STARTED", "FULFILLING"],
  ["FULFILLING", "DELIVERY_SUCCEEDED", "DELIVERED"],
  ["FULFILLING", "DELIVERY_FAILED", "FAILED"],
  ["FAILED", "REFUNDED", "REFUNDED"],
]

describe("order status transitions", () => {
  it.each(VALID_PAIRS)("allows %s + %s -> %s", (status, event, expected) => {
    expect(transition(status, event)).toBe(expected)
  })

  it("rejects DELIVERED -> REFUNDED and the status stays DELIVERED", () => {
    const status: OrderStatus = "DELIVERED"
    expect(() => transition(status, "REFUNDED")).toThrow(InvalidTransition)
    expect(status).toBe("DELIVERED")
  })

  it("throws InvalidTransition for all other pairs", () => {
    const validSet = new Set(VALID_PAIRS.map(([s, e]) => `${s}:${e}`))
    for (const status of STATUSES) {
      for (const event of EVENTS) {
        const key = `${status}:${event}`
        if (validSet.has(key)) {
          continue
        }
        expect(() => transition(status, event)).toThrow(InvalidTransition)
      }
    }
  })

  it("InvalidTransition is Error with message naming event and status", () => {
    try {
      transition("CREATED", "PAYMENT_CONFIRMED")
      throw new Error("should not reach")
    } catch (err) {
      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(InvalidTransition)
      expect((err as Error).message).toBe("Cannot apply PAYMENT_CONFIRMED to CREATED")
    }
  })

  it("property: no terminal status accepts any event", () => {
    fc.assert(
      fc.property(fc.constantFrom<OrderStatus>("EXPIRED", "REFUNDED"), fc.constantFrom(...EVENTS), (status, event) => {
        expect(() => transition(status, event)).toThrow(InvalidTransition)
      }),
    )
  })

  it("property: applying any single event never returns the same status it started from", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STATUSES),
        fc.constantFrom(...EVENTS),
        (status, event) => {
          const validSet = new Set(VALID_PAIRS.map(([s, e]) => `${s}:${e}`))
          const key = `${status}:${event}`
          if (validSet.has(key)) {
            const result = transition(status, event)
            expect(result).not.toBe(status)
          } else {
            expect(() => transition(status, event)).toThrow(InvalidTransition)
          }
        },
      ),
    )
  })
})
