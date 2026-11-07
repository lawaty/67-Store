import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const saveVipLevelsMock = vi.fn()
const isAdminRequestMock = vi.fn()

vi.mock("@/api/container", () => ({ getContainer: () => ({}) }))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))
vi.mock("@/api/admin", () => ({ saveVipLevels: (...args: unknown[]) => saveVipLevelsMock(...args) }))

const { POST } = await import("./route")

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
})

describe("POST /api/admin/settings/vip-curve", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await POST(new NextRequest("http://localhost/api/admin/settings/vip-curve", { method: "POST" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(saveVipLevelsMock).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON bodies", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/vip-curve", {
        method: "POST",
        body: "nope",
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
  })

  it("saves the VIP levels and returns ok", async () => {
    saveVipLevelsMock.mockResolvedValue({ ok: true })

    const levels = [
      { key: "epic", coins: 0, percent: 20, title: "Epic", icon: "shield", color: "sky" },
      { key: "mythic", coins: 1000, percent: 15, title: "Mythic", icon: "gem", color: "gold" },
    ]

    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/vip-curve", {
        method: "POST",
        body: JSON.stringify({ levels }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(saveVipLevelsMock).toHaveBeenCalledWith({}, { levels })
  })

  it("rejects a missing or non-array levels body", async () => {
    const missing = await POST(
      new NextRequest("http://localhost/api/admin/settings/vip-curve", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    )
    expect(missing.status).toBe(400)
    await expect(missing.json()).resolves.toEqual({ error: "bad_request" })

    const nonArray = await POST(
      new NextRequest("http://localhost/api/admin/settings/vip-curve", {
        method: "POST",
        body: JSON.stringify({ levels: "nope" }),
      }),
    )
    expect(nonArray.status).toBe(400)
    await expect(nonArray.json()).resolves.toEqual({ error: "bad_request" })

    expect(saveVipLevelsMock).not.toHaveBeenCalled()
  })

  it("maps service validation failures to 400", async () => {
    saveVipLevelsMock.mockResolvedValue({ ok: false, error: "مستويات VIP مش صالحة" })

    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/vip-curve", {
        method: "POST",
        body: JSON.stringify({ levels: [] }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "مستويات VIP مش صالحة" })
  })
})
