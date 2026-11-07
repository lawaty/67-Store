import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const quoteDepositMock = vi.fn()
const startWalletFundingMock = vi.fn()
const sessionFromRequestMock = vi.fn()

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    quoteDeposit: (...args: unknown[]) => quoteDepositMock(...args),
    startWalletFunding: (...args: unknown[]) => startWalletFundingMock(...args),
  }),
}))
vi.mock("@/api/auth", () => ({ sessionFromRequest: (request: Request) => sessionFromRequestMock(request) }))

const { GET, POST } = await import("./route")

function getFund(query: string): Promise<Response> {
  return GET(new NextRequest(`http://localhost/api/account/fund${query}`, { method: "GET" }))
}

function postFund(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/account/fund", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionFromRequestMock.mockReturnValue({ accountId: "a1", clientId: "c1" })
  quoteDepositMock.mockResolvedValue({
    ok: true,
    quote: {
      currency: "EGP",
      amountMinor: 10000,
      rateMinor: 50,
      coins: 200,
      wacEgpMinor: 4800,
      egpValueMinor: 10000,
      coinValueMinor: 10,
    },
  })
  startWalletFundingMock.mockResolvedValue({
    ok: true,
    funding: {},
    redirectUrl: "/checkout/fake/fake_instapay_fund_f1",
  })
})

describe("GET /api/account/fund", () => {
  it("rejects requests without a session", async () => {
    sessionFromRequestMock.mockReturnValue(null)

    const response = await getFund("?currency=EGP&amountMinor=10000")

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(quoteDepositMock).not.toHaveBeenCalled()
  })

  it("rejects an unsupported currency", async () => {
    const response = await getFund("?currency=SAR&amountMinor=10000")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "amount" })
    expect(quoteDepositMock).not.toHaveBeenCalled()
  })

  it("rejects an invalid amount", async () => {
    const response = await getFund("?currency=EGP&amountMinor=0")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "amount" })
    expect(quoteDepositMock).not.toHaveBeenCalled()
  })

  it("returns only the projected quote fields", async () => {
    const response = await getFund("?currency=EGP&amountMinor=10000")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      currency: "EGP",
      amountMinor: 10000,
      rateMinor: 50,
      coins: 200,
      egpValueMinor: 10000,
    })
    expect(quoteDepositMock).toHaveBeenCalledWith({ currency: "EGP", amountMinor: 10000 })
  })
})

describe("POST /api/account/fund", () => {
  it("rejects requests without a session", async () => {
    sessionFromRequestMock.mockReturnValue(null)

    const response = await postFund({ currency: "EGP", amountMinor: 10000 })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(startWalletFundingMock).not.toHaveBeenCalled()
  })

  it("rejects an invalid body", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/account/fund", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    expect(startWalletFundingMock).not.toHaveBeenCalled()
  })

  it("starts a funding and returns the redirect", async () => {
    const response = await postFund({ currency: "EGP", amountMinor: 10000 })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      redirectUrl: "/checkout/fake/fake_instapay_fund_f1",
    })
    expect(startWalletFundingMock).toHaveBeenCalledWith({
      clientId: "c1",
      currency: "EGP",
      amountMinor: 10000,
    })
  })
})
