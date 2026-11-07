import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const recordFundingMock = vi.fn()
const isAdminRequestMock = vi.fn()

vi.mock("@/api/container", () => ({ getContainer: () => ({}) }))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))
vi.mock("@/api/admin", () => ({ recordFunding: (...args: unknown[]) => recordFundingMock(...args) }))

const { POST } = await import("./route")

function postFunding(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/admin/funding", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
  recordFundingMock.mockResolvedValue({ ok: true })
})

describe("POST /api/admin/funding", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await postFunding({ egpPaidMinor: 10100, usdtMinor: 200 })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(recordFundingMock).not.toHaveBeenCalled()
  })

  it("records valid funding", async () => {
    const response = await postFunding({ egpPaidMinor: 10100, usdtMinor: 200 })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(recordFundingMock).toHaveBeenCalledWith({}, { egpPaidMinor: 10100, usdtMinor: 200 })
  })

  it("propagates exceeds_free as a 400 error", async () => {
    recordFundingMock.mockResolvedValue({ ok: false, error: "exceeds_free" })

    const response = await postFunding({ egpPaidMinor: 10100, usdtMinor: 99999 })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "exceeds_free" })
  })

  it("rejects invalid amounts without calling recordFunding", async () => {
    const response = await postFunding({ egpPaidMinor: 0, usdtMinor: 200 })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    expect(recordFundingMock).not.toHaveBeenCalled()
  })
})
