import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const saveP2pSettingsMock = vi.fn()
const isAdminRequestMock = vi.fn()

vi.mock("@/api/container", () => ({ getContainer: () => ({ settings: {} }) }))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))
vi.mock("@/api/admin", () => ({ saveP2pSettings: (...args: unknown[]) => saveP2pSettingsMock(...args) }))

const { POST } = await import("./route")

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
})

describe("POST /api/admin/settings/p2p", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await POST(new NextRequest("http://localhost/api/admin/settings/p2p", { method: "POST" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(saveP2pSettingsMock).not.toHaveBeenCalled()
  })

  it("rejects invalid JSON bodies", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/p2p", {
        method: "POST",
        body: "nope",
        headers: { "content-type": "application/json" },
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
  })

  it("saves settings and returns ok", async () => {
    saveP2pSettingsMock.mockResolvedValue({ ok: true })

    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/p2p", {
        method: "POST",
        body: JSON.stringify({ windowHours: 168, syncIntervalSeconds: 10_800, outlierSigma: 3 }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(saveP2pSettingsMock).toHaveBeenCalledWith({ settings: {} }, { windowHours: 168, syncIntervalSeconds: 10_800, outlierSigma: 3 })
  })

  it("defaults outlierSigma to 2 when absent", async () => {
    saveP2pSettingsMock.mockResolvedValue({ ok: true })

    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/p2p", {
        method: "POST",
        body: JSON.stringify({ windowHours: 168, syncIntervalSeconds: 10_800 }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(saveP2pSettingsMock).toHaveBeenCalledWith({ settings: {} }, { windowHours: 168, syncIntervalSeconds: 10_800, outlierSigma: 2 })
  })

  it("rejects out-of-range windowHours", async () => {
    for (const windowHours of [0, 721, 1.5]) {
      const response = await POST(
        new NextRequest("http://localhost/api/admin/settings/p2p", {
          method: "POST",
          body: JSON.stringify({ windowHours, syncIntervalSeconds: 10_800 }),
        }),
      )
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    }
    expect(saveP2pSettingsMock).not.toHaveBeenCalled()
  })

  it("rejects out-of-range sync intervals", async () => {
    for (const syncIntervalSeconds of [299, 10801, 1.5]) {
      const response = await POST(
        new NextRequest("http://localhost/api/admin/settings/p2p", {
          method: "POST",
          body: JSON.stringify({ windowHours: 24, syncIntervalSeconds }),
        }),
      )
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    }
    expect(saveP2pSettingsMock).not.toHaveBeenCalled()
  })

  it("accepts boundary values", async () => {
    saveP2pSettingsMock.mockResolvedValue({ ok: true })

    for (const body of [
      { windowHours: 1, syncIntervalSeconds: 300, outlierSigma: 1 },
      { windowHours: 720, syncIntervalSeconds: 10800, outlierSigma: 5 },
      { windowHours: 168, syncIntervalSeconds: 7200 },
    ]) {
      const response = await POST(
        new NextRequest("http://localhost/api/admin/settings/p2p", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      )
      expect(response.status).toBe(200)
    }
  })

  it("rejects out-of-range outlierSigma", async () => {
    for (const outlierSigma of [0, 6, 2.5]) {
      const response = await POST(
        new NextRequest("http://localhost/api/admin/settings/p2p", {
          method: "POST",
          body: JSON.stringify({ windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma }),
        }),
      )
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    }
    expect(saveP2pSettingsMock).not.toHaveBeenCalled()
  })

  it("maps writer RangeError to bad_request", async () => {
    saveP2pSettingsMock.mockRejectedValue(new RangeError("invalid"))

    const response = await POST(
      new NextRequest("http://localhost/api/admin/settings/p2p", {
        method: "POST",
        body: JSON.stringify({ windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 2 }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
  })
})
