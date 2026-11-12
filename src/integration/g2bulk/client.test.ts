import { describe, expect, it } from "vitest"
import { createG2Bulk } from "./client"
import { DistributorError } from "@/fulfilment"
import { player } from "@/ordering"
import { product } from "@/catalogue"
import { money } from "../../shared/money"

describe("g2bulk client", () => {
  it("checkPlayer posts to the right URL with the API key header and the expected JSON body", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ valid: "valid", name: "Test" }) }
    }
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "key123", fetch: fetchStub as any })
    await client.checkPlayer({ game: "mlbb", player: player("123", "456") })
    expect(calls[0].url).toBe("https://example.com/v1/games/checkPlayerId")
    expect(calls[0].init.headers["X-API-Key"]).toBe("key123")
    expect(JSON.parse(calls[0].init.body)).toEqual({ game: "mlbb", user_id: "123", server_id: "456" })
  })

  it("checkPlayer maps valid: \"valid\" with a name to { valid: true, name }", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ valid: "valid", name: "Hero" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com/", apiKey: "k", fetch: fetchStub as any })
    const res = await client.checkPlayer({ game: "mlbb", player: player("1", "2") })
    expect(res).toEqual({ valid: true, name: "Hero" })
  })

  it("checkPlayer maps valid: \"invalid\" to { valid: false, ... }", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ valid: "invalid", name: null }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const res = await client.checkPlayer({ game: "mlbb", player: player("1", "2") })
    expect(res.valid).toBe(false)
  })

  it("placeOrder sends the idempotency header as a derived UUID and the new body shape", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ order_id: "d1", status: "PENDING" }) }
    }
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect(calls[0].init.headers["X-Idempotency-Key"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    const body = JSON.parse(calls[0].init.body)
    expect(body).toEqual({ catalogue_name: "Diamonds", player_id: "1", server_id: "2", remark: "ord123" })
  })

  it("placeOrder unwraps a { data: { order_id, status } } envelope", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ data: { order_id: "do99", status: "PROCESSING" } }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect(res).toEqual({ distributorOrderId: "do99", status: "PROCESSING" })
  })

  it("placeOrder maps a numeric order_id to a string distributorOrderId", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ order_id: 12345, status: "PENDING" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect(res).toEqual({ distributorOrderId: "12345", status: "PENDING" })
  })

  it("placeOrder unwraps the real { success, message, order } envelope", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ success: true, message: "Order created", order: { order_id: 2251529, status: "PENDING" } }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect(res).toEqual({ distributorOrderId: "2251529", status: "PENDING" })
  })

  it("getOrder unwraps the real { success, order } envelope", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ success: true, order: { order_id: 2251529, status: "COMPLETED" } }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const res = await client.getOrder({ distributorOrderId: "2251529", game: "mlbb" })
    expect(res).toEqual({ distributorOrderId: "2251529", status: "COMPLETED" })
  })

  it("getOrder maps a numeric order_id in the status response", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ order_id: 12345, status: "completed" }) }
    }
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const res = await client.getOrder({ distributorOrderId: "12345", game: "mlbb" })
    expect(calls[0].init.body).toBe(JSON.stringify({ order_id: 12345, game: "mlbb" }))
    expect(res).toEqual({ distributorOrderId: "12345", status: "COMPLETED" })
  })

  it("getOrder posts the distributor order id and maps COMPLETED", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ order_id: "do5", status: "completed" }) }
    }
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const res = await client.getOrder({ distributorOrderId: "do5", game: "mlbb" })
    expect(calls[0].init.body).toBe(JSON.stringify({ order_id: Number("do5"), game: "mlbb" }))
    expect(res.status).toBe("COMPLETED")
  })

  it("A 410 response from getOrder yields status FAILED rather than throwing", async () => {
    const fetchStub = async () => ({ ok: false, status: 410, json: async () => ({}) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const res = await client.getOrder({ distributorOrderId: "do5", game: "mlbb" })
    expect(res.status).toBe("FAILED")
  })

  it("A 500 response throws DistributorError carrying the status", async () => {
    const fetchStub = async () => ({ ok: false, status: 500, json: async () => ({}) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    await expect(client.getOrder({ distributorOrderId: "do5", game: "mlbb" })).rejects.toBeInstanceOf(DistributorError)
    await expect(client.getOrder({ distributorOrderId: "do5", game: "mlbb" })).rejects.toMatchObject({ status: 500 })
  })

  it("An unknown status string throws DistributorError", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ order_id: "do5", status: "CANCELLED" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    await expect(client.getOrder({ distributorOrderId: "do5", game: "mlbb" })).rejects.toBeInstanceOf(DistributorError)
  })

  it("A body with success: false and a message produces an error carrying that message (non-2xx)", async () => {
    const fetchStub = async () => ({ ok: false, status: 400, json: async () => ({ success: false, message: "Bad request" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const err: any = await client.getOrder({ distributorOrderId: "do5", game: "mlbb" }).catch(e => e)
    expect(err).toBeInstanceOf(DistributorError)
    expect(err.message).toBe("Bad request")
  })

  it("getBalance GETs /v1/getMe and converts the USD balance to milli-USD", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ balance: 1.234, success: true }) }
    }
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "key123", fetch: fetchStub as any })
    const res = await client.getBalance()
    expect(calls[0].url).toBe("https://example.com/v1/getMe")
    expect(calls[0].init.method).toBe("GET")
    expect(calls[0].init.headers["X-API-Key"]).toBe("key123")
    expect(res).toEqual({ balanceMilli: 1234 })
  })

  it("getBalance throws DistributorError on a non-200 response", async () => {
    const fetchStub = async () => ({ ok: false, status: 401, json: async () => ({ success: false, message: "Unauthorized" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    await expect(client.getBalance()).rejects.toBeInstanceOf(DistributorError)
    await expect(client.getBalance()).rejects.toMatchObject({ status: 401 })
  })

  it("placeOrder real envelope with price sets priceMinor", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ success: true, order: { order_id: 2251529, status: "PENDING", price: 1.37 } }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect(res.priceMinor).toBe(137)
  })

  it("placeOrder maps flat payload with string price to priceMinor", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ order_id: "do5", status: "pending", price: "0.88" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect(res.priceMinor).toBe(88)
  })

  it("placeOrder payload with no price omits priceMinor", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ order_id: "do5", status: "PENDING" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect("priceMinor" in res).toBe(false)
  })

  it("placeOrder payload with non-numeric price omits priceMinor", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ order_id: "do5", status: "PENDING", price: "abc" }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect("priceMinor" in res).toBe(false)
  })

  it("getOrder response with price sets priceMinor", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ success: true, order: { order_id: 2251529, status: "COMPLETED", price: 1.37 } }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const res = await client.getOrder({ distributorOrderId: "2251529", game: "mlbb" })
    expect(res.priceMinor).toBe(137)
  })

  it("maps payload price 0.165 to priceUsdtMilli 165 and priceMinor 17", async () => {
    const fetchStub = async () => ({ ok: true, status: 200, json: async () => ({ order_id: "do5", status: "PENDING", price: 0.165 }) })
    const client = createG2Bulk({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const p = product({ id: "mlbb:1", distributorId: "2793", name: "Diamonds", cost: money(100, "USD"), game: "mlbb" })
    const res = await client.placeOrder({ orderId: "ord123", game: "mlbb", product: p, player: player("1", "2") })
    expect(res.priceUsdtMilli).toBe(165)
    expect(res.priceMinor).toBe(17)
  })
})
