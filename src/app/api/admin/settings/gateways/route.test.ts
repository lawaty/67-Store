import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const readAdminGatewaysMock = vi.fn()
const saveAdminGatewaysMock = vi.fn()
const isAdminRequestMock = vi.fn()

vi.mock("@/api/container", () => ({ getContainer: () => ({ settings: {}, gatewaySettings: vi.fn() }) }))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))
vi.mock("@/api/admin", () => ({
  readAdminGateways: (...args: unknown[]) => readAdminGatewaysMock(...args),
  saveAdminGateways: (...args: unknown[]) => saveAdminGatewaysMock(...args),
}))

const { GET, POST } = await import("./route")

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
})

describe("GET /api/admin/settings/gateways", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await GET(new NextRequest("http://localhost/api/admin/settings/gateways", { method: "GET" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(readAdminGatewaysMock).not.toHaveBeenCalled()
  })

  it("returns the container's settings when authenticated", async () => {
    const settings = { card: true, wallet: false, crypto: false, coins: true, fulfilmentEnabled: true }
    readAdminGatewaysMock.mockResolvedValue(settings)

    const response = await GET(new NextRequest("http://localhost/api/admin/settings/gateways", { method: "GET" }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(settings)
  })
})

describe("POST /api/admin/settings/gateways", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await POST(new NextRequest("http://localhost/api/admin/settings/gateways", { method: "POST" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(saveAdminGatewaysMock).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON bodies", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/gateways", {
        method: "POST",
        body: "nope",
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
  })

  it("rejects non-boolean field and does not call save", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/gateways", {
        method: "POST",
        body: JSON.stringify({ card: "true", wallet: true, crypto: false, coins: true, fulfilmentEnabled: true }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    expect(saveAdminGatewaysMock).not.toHaveBeenCalled()
  })

  it("saves valid booleans and returns ok", async () => {
    saveAdminGatewaysMock.mockResolvedValue({ ok: true })
    const payload = { card: false, wallet: true, crypto: false, coins: true, fulfilmentEnabled: false }

    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/gateways", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(saveAdminGatewaysMock).toHaveBeenCalledWith(
      { settings: {}, gatewaySettings: expect.any(Function) },
      payload,
    )
  })
})
