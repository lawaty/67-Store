import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const recordDepositMock = vi.fn()
const isAdminRequestMock = vi.fn()

vi.mock("@/api/container", () => ({ getContainer: () => ({}) }))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))
vi.mock("@/api/admin", () => ({ recordDeposit: (...args: unknown[]) => recordDepositMock(...args) }))

const { POST } = await import("./route")

function postDeposit(body: unknown): Promise<Response> {
  return POST(
    new NextRequest("http://localhost/api/admin/deposit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
  recordDepositMock.mockResolvedValue({ ok: true })
})

describe("POST /api/admin/deposit", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await postDeposit({ clientId: "c1", currency: "EGP", amountMinor: 10000 })

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(recordDepositMock).not.toHaveBeenCalled()
  })

  it.each(["SAR", "AED", "JOD"])("rejects %s deposits", async (currency) => {
    const response = await postDeposit({ clientId: "c1", currency, amountMinor: 10000 })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    expect(recordDepositMock).not.toHaveBeenCalled()
  })

  it.each(["EGP", "USD"])("accepts %s deposits", async (currency) => {
    const response = await postDeposit({ clientId: "c1", currency, amountMinor: 10000 })

    expect(response.status).toBe(200)
    expect(recordDepositMock).toHaveBeenCalledWith({}, { clientId: "c1", currency, amountMinor: 10000 })
  })
})
