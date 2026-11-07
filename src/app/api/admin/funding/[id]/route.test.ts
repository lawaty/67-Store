import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const rollbackFundingMock = vi.fn()
const isAdminRequestMock = vi.fn()

vi.mock("@/api/container", () => ({ getContainer: () => ({}) }))
vi.mock("@/api/auth", () => ({ isAdminRequest: (request: Request) => isAdminRequestMock(request) }))
vi.mock("@/api/admin", () => ({ rollbackFunding: (...args: unknown[]) => rollbackFundingMock(...args) }))

const { DELETE } = await import("./route")

function deleteFunding(id: string): Promise<Response> {
  return DELETE(
    new NextRequest(`http://localhost/api/admin/funding/${encodeURIComponent(id)}`, { method: "DELETE" }),
    { params: Promise.resolve({ id }) },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  isAdminRequestMock.mockReturnValue(true)
  rollbackFundingMock.mockResolvedValue({ ok: true })
})

describe("DELETE /api/admin/funding/[id]", () => {
  it("rejects unauthenticated requests with 401", async () => {
    isAdminRequestMock.mockReturnValue(false)

    const response = await deleteFunding("f1")

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(rollbackFundingMock).not.toHaveBeenCalled()
  })

  it("returns 200 on success", async () => {
    const response = await deleteFunding("f1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(rollbackFundingMock).toHaveBeenCalledWith({}, "f1")
  })

  it("returns 404 for not_found", async () => {
    rollbackFundingMock.mockResolvedValue({ ok: false, error: "not_found" })

    const response = await deleteFunding("missing")

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
  })

  it("returns 409 for locked", async () => {
    rollbackFundingMock.mockResolvedValue({ ok: false, error: "locked" })

    const response = await deleteFunding("f1")

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({ error: "locked" })
  })
})
