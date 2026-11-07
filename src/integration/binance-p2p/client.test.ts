import { describe, expect, it } from "vitest"
import { createBinanceP2p } from "./client"
import { P2pRateError } from "@/treasury"

describe("binance-p2p client", () => {
  it("fake fetch capturing {url, init}; assert full URL, method POST, Content-Type header, exact JSON body", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return {
        ok: true,
        status: 200,
        json: async () => ({
          code: "000000",
          data: [
            { adv: { price: "48.70", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
            { adv: { price: "48.75", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
            { adv: { price: "48.80", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          ],
        }),
      }
    }
    const client = createBinanceP2p({ fetch: fetchStub as any, now: () => "2024-01-01T00:00:00.000Z" })
    await client.readQuote()
    expect(calls[0].url).toBe("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search")
    expect(calls[0].init.method).toBe("POST")
    expect(calls[0].init.headers["Content-Type"]).toBe("application/json")
    expect(calls[0].init.body).toBe(JSON.stringify({ asset: "USDT", fiat: "EGP", tradeType: "BUY", page: 1, rows: 20 }))
  })

  it("success envelope → quote carrying the injected now() timestamp", async () => {
    const fetchStub = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        code: "000000",
        data: [
          { adv: { price: "48.70", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "48.75", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "48.80", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
        ],
      }),
    })
    const client = createBinanceP2p({ fetch: fetchStub as any, now: () => "2024-06-01T12:00:00.000Z" })
    const quote = await client.readQuote()
    expect(quote.fetchedAt).toBe("2024-06-01T12:00:00.000Z")
    expect(quote.egpPerUsdtMinor).toBe(4875)
  })

  it("returns per-method fields for a response with adv.tradeMethods", async () => {
    const fetchStub = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        code: "000000",
        data: [
          { adv: { price: "51.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "52.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "53.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "48.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Vodafone Cash" }] } },
          { adv: { price: "49.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Vodafone Cash" }] } },
          { adv: { price: "50.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Vodafone Cash" }] } },
        ],
      }),
    })
    const client = createBinanceP2p({ fetch: fetchStub as any, now: () => "2024-06-01T12:00:00.000Z" })
    const quote = await client.readQuote()
    expect(quote.egpPerUsdtMinor).toBe(5200)
    expect(quote.bankTransferEgpPerUsdtMinor).toBe(5200)
    expect(quote.vodafoneEgpPerUsdtMinor).toBe(4900)
    expect(quote.fetchedAt).toBe("2024-06-01T12:00:00.000Z")
  })

  it("HTTP 429 → P2pRateError with status 429", async () => {
    const fetchStub = async () => ({ ok: false, status: 429, json: async () => ({ message: "Too many requests" }) })
    const client = createBinanceP2p({ fetch: fetchStub as any, now: () => "2024-01-01T00:00:00.000Z" })
    await expect(client.readQuote()).rejects.toBeInstanceOf(P2pRateError)
    await expect(client.readQuote()).rejects.toMatchObject({ status: 429 })
  })

  it("error envelope → P2pRateError", async () => {
    const fetchStub = async () => ({ ok: false, status: 500, json: async () => ({ message: "error" }) })
    const client = createBinanceP2p({ fetch: fetchStub as any, now: () => "2024-01-01T00:00:00.000Z" })
    await expect(client.readQuote()).rejects.toBeInstanceOf(P2pRateError)
  })

  it("passes outlierSigma to parser: σ=1 and σ=2 produce different results from same payload; no options uses default", async () => {
    // [4800,4900,5000,5000,5100,5400]: σ=1 excludes 4800,5400 (outlierCount 2, adCount 4); σ=2 keeps all (outlierCount 0, adCount 6)
    const fetchStub = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        code: "000000",
        data: [
          { adv: { price: "48.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "49.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "50.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "50.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "51.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
          { adv: { price: "54.00", tradableQuantity: "200.00", tradeMethods: [{ tradeMethodName: "Bank Transfer" }] } },
        ],
      }),
    })
    const client = createBinanceP2p({ fetch: fetchStub as any, now: () => "2024-01-01T00:00:00.000Z" })
    const q1 = await client.readQuote({ outlierSigma: 1 })
    expect(q1.range?.outlierCount).toBe(2)
    expect(q1.range?.adCount).toBe(4)
    const q2 = await client.readQuote({ outlierSigma: 2 })
    expect(q2.range?.outlierCount).toBe(0)
    expect(q2.range?.adCount).toBe(6)
    const qDefault = await client.readQuote()
    expect(qDefault.range?.outlierCount).toBe(0)
    expect(qDefault.range?.adCount).toBe(6)
  })
})
