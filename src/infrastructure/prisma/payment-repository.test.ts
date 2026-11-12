import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaPaymentRepository } from "./payment-repository"
import { money } from "@/shared/money"
import { payment } from "@/payments"

function makePayment() {
  return payment({
    id: "pay-1",
    orderId: "order-1",
    provider: "PAYMOB",
    providerReference: "ref-1",
    amount: money(1000, "USD"),
    status: "PENDING",
  })
}

function makeDb() {
  return {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  } as unknown as PrismaClient
}

describe("createPrismaPaymentRepository.saveIfAbsent", () => {
  it("returns true and calls create once on success", async () => {
    const db = makeDb()
    ;(db.payment.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
    const repo = createPrismaPaymentRepository(db)
    const p = makePayment()

    const result = await repo.saveIfAbsent(p)

    expect(result).toBe(true)
    expect(db.payment.create).toHaveBeenCalledTimes(1)
    expect(db.payment.create).toHaveBeenCalledWith({
      data: {
        id: p.id,
        orderId: p.orderId,
        provider: p.provider,
        providerReference: p.providerReference,
        amountMinor: p.amount.minor,
        currency: p.amount.currency,
        status: p.status,
      },
    })
  })

  it("returns false on P2002 when existing row matches orderId and provider", async () => {
    const db = makeDb()
    const p = makePayment()
    ;(db.payment.create as ReturnType<typeof vi.fn>).mockRejectedValue({ code: "P2002" })
    ;(db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "other-id",
      orderId: "order-1",
      provider: "PAYMOB",
      providerReference: "ref-1",
      amountMinor: 1000,
      currency: "USD",
      status: "PENDING",
    })
    const repo = createPrismaPaymentRepository(db)

    const result = await repo.saveIfAbsent(p)

    expect(result).toBe(false)
    expect(db.payment.findUnique).toHaveBeenCalledWith({ where: { providerReference: p.providerReference } })
  })

  it("rethrows on P2002 when existing row has different orderId or provider", async () => {
    const db = makeDb()
    const p = makePayment()
    const error = { code: "P2002" }
    ;(db.payment.create as ReturnType<typeof vi.fn>).mockRejectedValue(error)
    ;(db.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "other-id",
      orderId: "order-2",
      provider: "CRYPTO",
      providerReference: "ref-1",
      amountMinor: 1000,
      currency: "USD",
      status: "PENDING",
    })
    const repo = createPrismaPaymentRepository(db)

    await expect(repo.saveIfAbsent(p)).rejects.toBe(error)
  })

  it("rethrows on non-P2002 errors", async () => {
    const db = makeDb()
    const p = makePayment()
    const error = new Error("db down")
    ;(db.payment.create as ReturnType<typeof vi.fn>).mockRejectedValue(error)
    const repo = createPrismaPaymentRepository(db)

    await expect(repo.saveIfAbsent(p)).rejects.toBe(error)
    expect(db.payment.findUnique).not.toHaveBeenCalled()
  })

  it("expirePendingOlderThan(date) calls updateMany with status PENDING, createdAt lt date, data EXPIRED, and returns count", async () => {
    const db = makeDb()
    ;(db.payment.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 })
    const repo = createPrismaPaymentRepository(db)
    const date = new Date("2026-11-11T12:00:00.000Z")

    await expect(repo.expirePendingOlderThan(date)).resolves.toBe(3)

    expect(db.payment.updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", createdAt: { lt: date } },
      data: { status: "EXPIRED" },
    })
  })
})
