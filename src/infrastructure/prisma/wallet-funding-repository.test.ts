import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaWalletFundingRepository } from "./wallet-funding-repository"
import { WalletFunding } from "@/treasury"

const NOW = "2026-11-07T01:00:00.000Z"
const CREATED = "2026-11-07T00:00:00.000Z"

const funding: WalletFunding = {
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
  createdAt: CREATED,
  paidAt: null,
}

function row(overrides: Record<string, unknown> = {}) {
  return {
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
    createdAt: new Date(CREATED),
    paidAt: null,
    ...overrides,
  }
}

function fakeDb(overrides: Record<string, unknown> = {}) {
  return {
    walletFunding: {
      create: vi.fn().mockResolvedValue(undefined),
      findUnique: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
  } as unknown as PrismaClient & {
    walletFunding: {
      create: ReturnType<typeof vi.fn>
      findUnique: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }
}

describe("createPrismaWalletFundingRepository", () => {
  it("create maps dates", async () => {
    const db = fakeDb()
    const repo = createPrismaWalletFundingRepository(db)
    await repo.create(funding)
    expect(db.walletFunding.create).toHaveBeenCalledWith({
      data: {
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
        createdAt: new Date(CREATED),
        paidAt: null,
      },
    })
  })

  it("create maps paidAt date when present", async () => {
    const db = fakeDb()
    const repo = createPrismaWalletFundingRepository(db)
    await repo.create({ ...funding, status: "PAID", paidAt: NOW, depositId: "d1" })
    expect(db.walletFunding.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paidAt: new Date(NOW) }) }),
    )
  })

  it("findByReference maps through the domain factory", async () => {
    const db = fakeDb({ findUnique: vi.fn().mockResolvedValue(row()) })
    const repo = createPrismaWalletFundingRepository(db)
    const result = await repo.findByReference("fake_paymob_fund_f1")
    expect(db.walletFunding.findUnique).toHaveBeenCalledWith({
      where: { providerReference: "fake_paymob_fund_f1" },
    })
    expect(result).toEqual(funding)
  })

  it("findByReference returns null when row is null", async () => {
    const db = fakeDb({ findUnique: vi.fn().mockResolvedValue(null) })
    const repo = createPrismaWalletFundingRepository(db)
    await expect(repo.findByReference("missing")).resolves.toBeNull()
  })

  it("markPaid uses the conditional updateMany and returns count===1", async () => {
    const db = fakeDb({ updateMany: vi.fn().mockResolvedValue({ count: 1 }) })
    const repo = createPrismaWalletFundingRepository(db)
    await expect(repo.markPaid("f1", NOW)).resolves.toBe(true)
    expect(db.walletFunding.updateMany).toHaveBeenCalledWith({
      where: { id: "f1", status: "PENDING" },
      data: { status: "PAID", paidAt: new Date(NOW) },
    })
  })

  it("markPaid returns false when count is not 1", async () => {
    const db = fakeDb({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) })
    const repo = createPrismaWalletFundingRepository(db)
    await expect(repo.markPaid("f1", NOW)).resolves.toBe(false)
  })

  it("attachDeposit updates by id", async () => {
    const db = fakeDb()
    const repo = createPrismaWalletFundingRepository(db)
    await repo.attachDeposit("f1", "d1")
    expect(db.walletFunding.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { depositId: "d1" },
    })
  })
})
