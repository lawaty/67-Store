import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const saveCoinIndexCapMock = vi.fn()
const isAdminRequestMock = vi.fn()

vi.mock("@/api/container", () => ({ getContainer: () => ({ settings: {} }) }))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))
vi.mock("@/api/admin", () => ({ saveCoinIndexCap: (...args: unknown[]) => saveCoinIndexCapMock(...args) }))

const { POST } = await import("./route")

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
})

describe("POST /api/admin/settings/coin-index-cap", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await POST(new NextRequest("http://localhost/api/admin/settings/coin-index-cap", { method: "POST" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(saveCoinIndexCapMock).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON bodies", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/coin-index-cap", {
        method: "POST",
        body: "nope",
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
  })

  it("saves the cap and returns ok", async () => {
    saveCoinIndexCapMock.mockResolvedValue({ ok: true })

    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/coin-index-cap", {
        method: "POST",
        body: JSON.stringify({ coinIndexCapBps: 250 }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(saveCoinIndexCapMock).toHaveBeenCalledWith({ settings: {} }, 250)
  })

  it("rejects out-of-range caps", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/coin-index-cap", {
        method: "POST",
        body: JSON.stringify({ coinIndexCapBps: 20000 }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    expect(saveCoinIndexCapMock).not.toHaveBeenCalled()
  })
})
