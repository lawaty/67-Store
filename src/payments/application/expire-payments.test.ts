import { describe, expect, it } from "vitest"
import { createExpirePayments, PAYMENT_EXPIRY_MINUTES } from "./expire-payments"
import { PaymentExpiryRepository } from "../ports/payment-expiry"

describe("createExpirePayments", () => {
  it("expires with a cutoff exactly now - 60 minutes", async () => {
    const now = new Date("2026-11-11T12:00:00.000Z")
    let received: Date | undefined
    const payments: PaymentExpiryRepository = {
      expirePendingOlderThan: async (cutoff) => {
        received = cutoff
        return 0
      },
    }
    const expire = createExpirePayments({ payments, now: () => now })

    await expire()

    expect(received).toEqual(
      new Date(now.getTime() - PAYMENT_EXPIRY_MINUTES * 60_000),
    )
  })

  it("returns the repository's count", async () => {
    const payments: PaymentExpiryRepository = {
      expirePendingOlderThan: async () => 7,
    }
    const expire = createExpirePayments({
      payments,
      now: () => new Date("2026-11-11T12:00:00.000Z"),
    })

    await expect(expire()).resolves.toEqual({ expired: 7 })
  })

  it("a zero count is returned as { expired: 0 }", async () => {
    const payments: PaymentExpiryRepository = {
      expirePendingOlderThan: async () => 0,
    }
    const expire = createExpirePayments({
      payments,
      now: () => new Date("2026-11-11T12:00:00.000Z"),
    })

    await expect(expire()).resolves.toEqual({ expired: 0 })
  })
})
