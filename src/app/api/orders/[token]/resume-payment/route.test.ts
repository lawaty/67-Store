import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const resumeOrderPaymentMock = vi.fn()
const sessionFromRequestMock = vi.fn()

vi.mock("@/api/orders", () => ({
  resumeOrderPayment: (...args: unknown[]) => resumeOrderPaymentMock(...args),
}))

vi.mock("@/api/container", () => ({
  getContainer: () => ({ fakeFulfilmentEnabled: () => false }),
}))

vi.mock("@/api/auth", () => ({
  sessionFromRequest: (request: Request) => sessionFromRequestMock(request),
}))

const { POST } = await import("./route")

function postResume(token: string, body: unknown): Promise<Response> {
  return POST(
    new NextRequest(`http://localhost/api/orders/${encodeURIComponent(token)}/resume-payment`, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: body === undefined ? {} : { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ token }) },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.G2BULK_API_KEY = "test-key"
  sessionFromRequestMock.mockReturnValue(null)
  resumeOrderPaymentMock.mockResolvedValue({ ok: true, redirectUrl: "/order/t1" })
})

describe("POST /api/orders/[token]/resume-payment", () => {
  it("returns 200 with the use-case result for { method: 'egp' }", async () => {
    const response = await postResume("t1", { method: "egp" })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(resumeOrderPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({}),
      "t1",
      "egp",
      expect.objectContaining({ session: null, allowFakeFulfilment: expect.any(Boolean), newId: expect.any(Function) }),
    )
  })

  it("returns 400 for missing/invalid JSON body", async () => {
    const missing = await postResume("t1", undefined)
    expect(missing.status).toBe(400)
    await expect(missing.json()).resolves.toEqual({ error: "bad_request" })

    const invalid = await POST(
      new NextRequest("http://localhost/api/orders/t1/resume-payment", {
        method: "POST",
        body: "{not json",
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ token: "t1" }) },
    )
    expect(invalid.status).toBe(400)
    await expect(invalid.json()).resolves.toEqual({ error: "bad_request" })
  })

  it("defaults omitted method to 'egp'", async () => {
    await postResume("t1", {})

    expect(resumeOrderPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({}),
      "t1",
      "egp",
      expect.any(Object),
    )
  })
})
