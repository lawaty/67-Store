import { describe, expect, it } from "vitest"
import { createG2BulkCatalogue } from "./catalogue-source"
import { DistributorError } from "@/fulfilment"

describe("g2bulk catalogue source", () => {
  it("calls the catalogue URL and sends the API key", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 200, json: async () => ({ success: true, catalogues: [] }) }
    }
    const src = createG2BulkCatalogue({ baseUrl: "https://example.com", apiKey: "abc", fetch: fetchStub as any })
    await src("mlbb")
    expect(calls[0].url).toBe("https://example.com/v1/games/mlbb/catalogue")
    expect(calls[0].init.headers["X-API-Key"]).toBe("abc")
  })

  it("maps a two-item payload into products with ids mlbb:2793 and mlbb:2819", async () => {
    const fetchStub = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        catalogues: [
          { id: 2793, name: "86 Diamonds", amount: 1.48 },
          { id: 2819, name: "172 Diamonds", amount: 2.96 },
        ],
      }),
    })
    const src = createG2BulkCatalogue({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    const products = await src("mlbb")
    expect(products.map(p => p.id)).toEqual(["mlbb:2793", "mlbb:2819"])
  })

  it("a 500 response throws DistributorError", async () => {
    const fetchStub = async () => ({ ok: false, status: 500, json: async () => ({}) })
    const src = createG2BulkCatalogue({ baseUrl: "https://example.com", apiKey: "k", fetch: fetchStub as any })
    await expect(src("mlbb")).rejects.toBeInstanceOf(DistributorError)
  })
})
