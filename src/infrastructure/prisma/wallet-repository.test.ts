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
    findUnique: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
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
      findUnique: vi.fn(),
      delete: vi.fn(),
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

  it("debit with the same reference twice: first call decrements + creates one entry; second returns true and does nothing", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    tx.walletEntry.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "e1", amount: -30, reference: "coins:o1" })
    tx.wallet.findUnique.mockResolvedValue({ id: "w1", clientId: "c1", coinBalance: 100 })
    tx.wallet.update.mockResolvedValue({ id: "w1", clientId: "c1", coinBalance: 70 })
    const repo = createPrismaWalletRepository(db)

    const first = await repo.debit("c1", 30, "purchase", "coins:o1")
    const second = await repo.debit("c1", 30, "purchase", "coins:o1")

    expect(first).toBe(true)
    expect(second).toBe(true)
    expect(tx.wallet.update).toHaveBeenCalledTimes(1)
    expect(tx.walletEntry.create).toHaveBeenCalledTimes(1)
    expect(tx.walletEntry.create).toHaveBeenCalledWith({
      data: {
        walletId: "w1",
        amount: -30,
        reason: "purchase",
        reference: "coins:o1",
      },
    })
  })

  it("credit with the same reference twice: one increment, one entry; second returns current wallet", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    tx.wallet.upsert.mockResolvedValue({ id: "w1", clientId: "c1", coinBalance: 0 })
    tx.walletEntry.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "e1", amount: 100, reference: "refund:o1" })
    tx.wallet.findUnique.mockResolvedValue({ id: "w1", clientId: "c1", coinBalance: 100 })
    tx.wallet.update.mockResolvedValue({ id: "w1", clientId: "c1", coinBalance: 100 })
    const repo = createPrismaWalletRepository(db)

    const first = await repo.credit("c1", 100, "refund", "refund:o1")
    const second = await repo.credit("c1", 100, "refund", "refund:o1")

    expect(first).toEqual({ clientId: "c1", coinBalance: 100 })
    expect(second).toEqual({ clientId: "c1", coinBalance: 100 })
    expect(tx.wallet.update).toHaveBeenCalledTimes(1)
    expect(tx.walletEntry.create).toHaveBeenCalledTimes(1)
  })

  it("findEntryByReference returns a mapped entry and null when absent", async () => {
    const db = {
      $transaction: vi.fn(),
      wallet: { upsert: vi.fn(), findFirst: vi.fn() },
      walletEntry: { findUnique: vi.fn() },
    } as unknown as PrismaClient
    const createdAt = new Date("2026-11-10T00:00:00.000Z")
    ;(db.walletEntry.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: "e1", amount: -30, reason: "purchase", reference: "coins:o1", createdAt })
      .mockResolvedValueOnce(null)
    const repo = createPrismaWalletRepository(db)

    const found = await repo.findEntryByReference("coins:o1")
    const missing = await repo.findEntryByReference("missing")

    expect(found).toEqual({ id: "e1", amount: -30, reason: "purchase", reference: "coins:o1", createdAt: "2026-11-10T00:00:00.000Z" })
    expect(missing).toBeNull()
  })

  it("reverseDebit increments wallet and deletes entry for existing debit; no-op when absent", async () => {
    const tx = makeTx()
    const db = makeDb(tx)
    tx.walletEntry.findUnique.mockResolvedValueOnce({ id: "e1", walletId: "w1", amount: -30, reference: "coins:o1" }).mockResolvedValueOnce(null)
    tx.wallet.update.mockResolvedValue({})
    tx.walletEntry.delete.mockResolvedValue({})
    const repo = createPrismaWalletRepository(db)

    await repo.reverseDebit("coins:o1")
    await repo.reverseDebit("coins:o1")

    expect(tx.wallet.update).toHaveBeenCalledTimes(1)
    expect(tx.wallet.update).toHaveBeenCalledWith({ where: { id: "w1" }, data: { coinBalance: { increment: 30 } } })
    expect(tx.walletEntry.delete).toHaveBeenCalledTimes(1)
    expect(tx.walletEntry.delete).toHaveBeenCalledWith({ where: { id: "e1" } })
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
