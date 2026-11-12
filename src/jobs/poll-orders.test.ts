import { describe, expect, it, vi } from "vitest"
import { createPollOrders } from "./poll-orders"
import { order, apply, attachDistributorOrder } from "@/ordering"
import { money } from "../shared/money"
import { product } from "@/catalogue"
import { player } from "@/ordering"
import { client } from "@/accounts"
import { OrderRepository } from "@/ordering"

function makeFulfillingOrder(id = "o1") {
  const o = order({
    id,
    token: `t${id}`,
    profileId: "p1",
    client: client("c1"),
    product: product({ id: "mlbb:2793", game: "mlbb", distributorId: "2793", name: "55", cost: money(73, "USD") }),
    player: player("1", "2"),
    price: money(12000, "USD"),
    markupBasisPoints: 2000,
  })
  let x = apply(o, "REQUEST_PAYMENT")
  x = apply(x, "PAYMENT_CONFIRMED")
  x = apply(x, "FULFILMENT_STARTED")
  x = attachDistributorOrder(x, "D1")
  return x
}

describe("createPollOrders", () => {
  it("checks only FULFILLING orders and returns the count", async () => {
    const orders = [makeFulfillingOrder("o1"), makeFulfillingOrder("o2")]
    const repo = { listByStatus: vi.fn().mockResolvedValue(orders), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) } as unknown as OrderRepository
    const sync = vi.fn().mockImplementation(async (o: any) => o)
    const poll = createPollOrders({ orders: repo, syncFulfilment: sync })
    const res = await poll()
    expect(repo.listByStatus).toHaveBeenCalledWith("FULFILLING", 100, 0)
    expect(res.checked).toBe(2)
    expect(res.updated).toBe(0)
    expect(res.failed).toBe(0)
  })

  it("counts an updated order when the sync returns a different status", async () => {
    const o = makeFulfillingOrder("o1")
    const updated = { ...o, status: "DELIVERED" } as any
    const repo = { listByStatus: vi.fn().mockResolvedValue([o]), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) } as unknown as OrderRepository
    const sync = vi.fn().mockResolvedValue(updated)
    const poll = createPollOrders({ orders: repo, syncFulfilment: sync })
    const res = await poll()
    expect(res.checked).toBe(1)
    expect(res.updated).toBe(1)
    expect(res.failed).toBe(0)
  })

  it("does not count an unchanged order", async () => {
    const o = makeFulfillingOrder("o1")
    const repo = { listByStatus: vi.fn().mockResolvedValue([o]), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) } as unknown as OrderRepository
    const sync = vi.fn().mockResolvedValue(o)
    const poll = createPollOrders({ orders: repo, syncFulfilment: sync })
    const res = await poll()
    expect(res.updated).toBe(0)
  })

  it("one rejecting sync does not stop the others and increments failed", async () => {
    const o1 = makeFulfillingOrder("o1")
    const o2 = makeFulfillingOrder("o2")
    const repo = { listByStatus: vi.fn().mockResolvedValue([o1, o2]), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) } as unknown as OrderRepository
    const sync = vi.fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(o2)
    const poll = createPollOrders({ orders: repo, syncFulfilment: sync })
    const res = await poll()
    expect(res.checked).toBe(2)
    expect(res.failed).toBe(1)
    expect(sync).toHaveBeenCalledTimes(2)
  })

  it("an empty result returns zeros", async () => {
    const repo = { listByStatus: vi.fn().mockResolvedValue([]), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) } as unknown as OrderRepository
    const sync = vi.fn()
    const poll = createPollOrders({ orders: repo, syncFulfilment: sync })
    const res = await poll()
    expect(res).toEqual({ checked: 0, updated: 0, failed: 0 })
  })

  it("calls sync sequentially", async () => {
    const o1 = makeFulfillingOrder("o1")
    const o2 = makeFulfillingOrder("o2")
    const repo = { listByStatus: vi.fn().mockResolvedValue([o1, o2]), sumCoinsChargedSince: vi.fn().mockResolvedValue(0) } as unknown as OrderRepository

    let resolveFirst: (v: any) => void
    const firstPromise = new Promise((resolve) => { resolveFirst = resolve })
    const sync = vi.fn()
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(async (o: any) => o)

    const poll = createPollOrders({ orders: repo, syncFulfilment: sync })
    const run = poll()
    // wait a tick
    await new Promise((r) => setTimeout(r, 0))
    expect(sync).toHaveBeenCalledTimes(1)
    resolveFirst!(o1)
    await run
    expect(sync).toHaveBeenCalledTimes(2)
  })

  it("pages through a FULFILLING backlog", async () => {
    const first = Array.from({ length: 100 }, (_, i) => makeFulfillingOrder(`o${i}`))
    const second = [makeFulfillingOrder("x1"), makeFulfillingOrder("x2")]
    const repo = {
      listByStatus: vi.fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second),
      sumCoinsChargedSince: vi.fn().mockResolvedValue(0),
    } as unknown as OrderRepository
    const sync = vi.fn().mockImplementation(async (o: any) => o)
    const poll = createPollOrders({ orders: repo, syncFulfilment: sync })
    const res = await poll()
    expect(repo.listByStatus).toHaveBeenNthCalledWith(1, "FULFILLING", 100, 0)
    expect(repo.listByStatus).toHaveBeenNthCalledWith(2, "FULFILLING", 100, 100)
    expect(repo.listByStatus).toHaveBeenCalledTimes(2)
    expect(res.checked).toBe(102)
  })
})
