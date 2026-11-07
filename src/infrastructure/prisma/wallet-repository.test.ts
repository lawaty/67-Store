import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaWalletRepository } from "./wallet-repository"

type Tx = {
  wallet: {
    upsert: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
  }
  walletEntry: {
    create: ReturnType<typeof vi.fn>
  }
}

function makeTx(overrides: Partial<Tx> = {}): Tx {
  return {
    wallet: {
      upsert: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      ...overrides.wallet,
    },
    walletEntry: {
      create: vi.fn(),
      ...overrides.walletEntry,
    },
  }
}

function makeDb(tx: Tx): PrismaClient {
  return {
    $transaction: vi.fn(async (fn: (t: Tx) => Promise<unknown>) => fn(tx)),
    wallet: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
  } as unknown as PrismaClient
}

describe("createPrismaWalletRepository (mocked Prisma)", () => {
  it("getOrCreate upserts by clientId", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    ;(db.wallet.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: 42,
      createdAt: new Date(),
    })
    const repo = createPrismaWalletRepository(db)

    const result = await repo.getOrCreate("client-1")

    expect(db.wallet.upsert).toHaveBeenCalledWith({
      where: { clientId: "client-1" },
      create: { clientId: "client-1" },
      update: {},
    })
    expect(result).toEqual({ clientId: "client-1", coinBalance: 42 })
  })

  it("credit runs a $transaction, increments coinBalance by the amount and creates a WalletEntry with the same positive amount and reason", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    tx.wallet.upsert.mockResolvedValue({ id: "wallet-1" })
    tx.wallet.update.mockResolvedValue({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: 100,
      createdAt: new Date(),
    })
    tx.walletEntry.create.mockResolvedValue({ id: "entry-1" })
    const repo = createPrismaWalletRepository(db)

    const result = await repo.credit("client-1", 100, "topup")

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.wallet.upsert).toHaveBeenCalledWith({
      where: { clientId: "client-1" },
      create: { clientId: "client-1" },
      update: {},
    })
    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { clientId: "client-1" },
      data: { coinBalance: { increment: 100 } },
    })
    expect(tx.walletEntry.create).toHaveBeenCalledWith({
      data: {
        walletId: "wallet-1",
        amount: 100,
        reason: "topup",
      },
    })
    expect(result).toEqual({ clientId: "client-1", coinBalance: 100 })
  })

  it("debit decrements coinBalance and creates an entry with the negated amount", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    tx.wallet.findUnique.mockResolvedValue({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: 100,
      createdAt: new Date(),
    })
    tx.wallet.update.mockResolvedValue({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: 70,
      createdAt: new Date(),
    })
    tx.walletEntry.create.mockResolvedValue({ id: "entry-2" })
    const repo = createPrismaWalletRepository(db)

    const result = await repo.debit("client-1", 30, "purchase")

    expect(db.$transaction).toHaveBeenCalledTimes(1)
    expect(tx.wallet.findUnique).toHaveBeenCalledWith({
      where: { clientId: "client-1" },
    })
    expect(tx.wallet.update).toHaveBeenCalledWith({
      where: { clientId: "client-1" },
      data: { coinBalance: { decrement: 30 } },
    })
    expect(tx.walletEntry.create).toHaveBeenCalledWith({
      data: {
        walletId: "wallet-1",
        amount: -30,
        reason: "purchase",
      },
    })
    expect(result).toBe(true)
  })

  it("debit on a missing wallet returns false and creates no entry", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    tx.wallet.findUnique.mockResolvedValue(null)
    const repo = createPrismaWalletRepository(db)

    const result = await repo.debit("missing", 10, "purchase")

    expect(result).toBe(false)
    expect(tx.wallet.update).not.toHaveBeenCalled()
    expect(tx.walletEntry.create).not.toHaveBeenCalled()
  })

  it("debit on an insufficient wallet returns false and creates no entry", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    tx.wallet.findUnique.mockResolvedValue({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: 5,
      createdAt: new Date(),
    })
    const repo = createPrismaWalletRepository(db)

    const result = await repo.debit("client-1", 10, "purchase")

    expect(result).toBe(false)
    expect(tx.wallet.update).not.toHaveBeenCalled()
    expect(tx.walletEntry.create).not.toHaveBeenCalled()
  })

  it("invariant arithmetic: sum of entry amounts passed to walletEntry.create equals net coinBalance change across credit and debit", async () => {
    const entryAmounts: number[] = []
    const creditTx = makeTx()
    creditTx.wallet.upsert.mockResolvedValue({ id: "wallet-1" })
    creditTx.wallet.update.mockImplementation(async (args: { data: { coinBalance: { increment: number } } }) => ({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: args.data.coinBalance.increment,
      createdAt: new Date(),
    }))
    creditTx.walletEntry.create.mockImplementation(async (args: { data: { amount: number } }) => {
      entryAmounts.push(args.data.amount)
      return { id: "e1" }
    })
    const creditDb = makeDb(creditTx)
    const creditRepo = createPrismaWalletRepository(creditDb)
    const credited = await creditRepo.credit("client-1", 100, "topup")

    const debitTx = makeTx()
    debitTx.wallet.findUnique.mockResolvedValue({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: credited.coinBalance,
      createdAt: new Date(),
    })
    debitTx.wallet.update.mockImplementation(async (args: { data: { coinBalance: { decrement: number } } }) => ({
      id: "wallet-1",
      clientId: "client-1",
      coinBalance: credited.coinBalance - args.data.coinBalance.decrement,
      createdAt: new Date(),
    }))
    debitTx.walletEntry.create.mockImplementation(async (args: { data: { amount: number } }) => {
      entryAmounts.push(args.data.amount)
      return { id: "e2" }
    })
    const debitDb = makeDb(debitTx)
    const debitRepo = createPrismaWalletRepository(debitDb)
    const debited = await debitRepo.debit("client-1", 30, "purchase")

    expect(debited).toBe(true)
    const netEntrySum = entryAmounts.reduce((sum, amount) => sum + amount, 0)
    const creditIncrement = (creditTx.wallet.update.mock.calls[0][0] as { data: { coinBalance: { increment: number } } }).data
      .coinBalance.increment
    const debitDecrement = (debitTx.wallet.update.mock.calls[0][0] as { data: { coinBalance: { decrement: number } } }).data
      .coinBalance.decrement
    expect(netEntrySum).toBe(creditIncrement - debitDecrement)
    expect(netEntrySum).toBe(70)
  })
})

describe.runIf(process.env.INTEGRATION_DB === "1")("createPrismaWalletRepository (real DB integration)", () => {
  let db: import("@prisma/client").PrismaClient | undefined
  let clientId = ""

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client")
    db = new PrismaClient()
    await db.$connect()
  })

  afterAll(async () => {
    if (db === undefined) return
    if (clientId !== "") {
      await db.walletEntry.deleteMany({ where: { wallet: { clientId } } })
      await db.wallet.deleteMany({ where: { clientId } })
      await db.client.deleteMany({ where: { id: clientId } })
    }
    await db.$disconnect()
  })

  it("balance equals the sum of its ledger entries after credit/debit operations", async () => {
    if (db === undefined) throw new Error("integration DB not initialized")
    clientId = `wallet-invariant-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await db.client.create({ data: { id: clientId } })
    const repo = createPrismaWalletRepository(db)

    await repo.getOrCreate(clientId)
    await repo.credit(clientId, 100, "test-credit-100")
    await repo.debit(clientId, 30, "test-debit-30")
    await repo.credit(clientId, 5, "test-credit-5")

    const wallet = await db.wallet.findUnique({ where: { clientId } })
    const entries = await db.walletEntry.findMany({ where: { wallet: { clientId } } })

    expect(wallet).not.toBeNull()
    expect(wallet?.coinBalance).toBe(75)
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(wallet?.coinBalance)
    expect(entries.reduce((sum, entry) => sum + entry.amount, 0)).toBe(75)
  })
})
