import { describe, expect, it } from "vitest"
import { createFakeDistributor } from "./fake-distributor"
import { player } from "@/ordering"
import { product } from "@/catalogue"
import { money } from "../../shared/money"

describe("createFakeDistributor", () => {
  it("accepts a valid player", async () => {
    const distributor = createFakeDistributor()
    const result = await distributor.checkPlayer({ game: "mlbb", player: player("12345", "678") })
    expect(result).toEqual({ valid: true, name: "لاعب تجريبي" })
  })

  it("rejects empty or whitespace-only userId/serverId", async () => {
    const distributor = createFakeDistributor()
    expect(
      await distributor.checkPlayer({ game: "mlbb", player: { userId: "", serverId: "678" } }),
    ).toEqual({ valid: false, name: null })
    expect(
      await distributor.checkPlayer({ game: "mlbb", player: { userId: "12345", serverId: "" } }),
    ).toEqual({ valid: false, name: null })
    expect(
      await distributor.checkPlayer({ game: "mlbb", player: { userId: "   ", serverId: "678" } }),
    ).toEqual({ valid: false, name: null })
    expect(
      await distributor.checkPlayer({ game: "mlbb", player: { userId: "12345", serverId: "  " } }),
    ).toEqual({ valid: false, name: null })
    expect(
      await distributor.checkPlayer({ game: "mlbb", player: { userId: "", serverId: "" } }),
    ).toEqual({ valid: false, name: null })
  })

  it("places an order as fake-<orderId> with COMPLETED", async () => {
    const distributor = createFakeDistributor()
    const result = await distributor.placeOrder({
      orderId: "order-1",
      game: "mlbb",
      product: product({
        id: "mlbb:fake-86",
        distributorId: "fake-86",
        name: "86 جوهرة",
        cost: money(99, "USD"),
        game: "mlbb",
      }),
      player: player("12345", "678"),
    })
    expect(result.distributorOrderId).toBe("fake-order-1")
    expect(result.distributorOrderId.length).toBeGreaterThan(0)
    expect(result.status).toBe("COMPLETED")
  })

  it("echoes the id from getOrder with COMPLETED", async () => {
    const distributor = createFakeDistributor()
    const result = await distributor.getOrder({ distributorOrderId: "fake-order-1", game: "mlbb" })
    expect(result).toEqual({ distributorOrderId: "fake-order-1", status: "COMPLETED" })
  })

  it("reports the fixed sandbox balance", async () => {
    const distributor = createFakeDistributor()
    const result = await distributor.getBalance()
    expect(result).toEqual({ balanceMinor: 99_999_999 })
  })
})
