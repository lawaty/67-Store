import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const isAdminRequestMock = vi.fn()
const setMock = vi.fn()

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    settings: {
      get: async () => null,
      set: (...args: unknown[]) => setMock(...args),
      delete: async () => {},
      all: async () => ({}),
    },
  }),
}))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))

const { POST } = await import("./route")

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
})

describe("POST /api/admin/operations-mode", () => {
  it("rejects unauthenticated requests", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await POST(new NextRequest("http://localhost/api/admin/operations-mode", { method: "POST" }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(setMock).not.toHaveBeenCalled()
  })

  it("rejects a missing mode", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/operations-mode", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    expect(setMock).not.toHaveBeenCalled()
  })

  it("rejects an invalid mode", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/operations-mode", {
        method: "POST",
        body: JSON.stringify({ mode: "unknown" }),
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "bad_request" })
    expect(setMock).not.toHaveBeenCalled()
  })

  it.each(["live", "sandbox"])("persists %s and returns ok", async (mode) => {
    const response = await POST(
      new NextRequest("http://localhost/api/admin/operations-mode", {
        method: "POST",
        body: JSON.stringify({ mode }),
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, mode })
    expect(setMock).toHaveBeenCalledWith("operations:mode", mode)
  })
})
