import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const readMock = vi.fn()

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    p2pRate: {
      read: (...args: unknown[]) => readMock(...args),
    },
  }),
}))

const { POST } = await import("./route")

const originalJobsSecret = process.env.JOBS_SECRET
const originalG2bulkApiKey = process.env.G2BULK_API_KEY

beforeEach(() => {
  vi.clearAllMocks()
  process.env.G2BULK_API_KEY = "test-g2bulk-key"
  process.env.JOBS_SECRET = "test-secret"
})

afterEach(() => {
  if (originalJobsSecret === undefined) {
    delete process.env.JOBS_SECRET
  } else {
    process.env.JOBS_SECRET = originalJobsSecret
  }
  if (originalG2bulkApiKey === undefined) {
    delete process.env.G2BULK_API_KEY
  } else {
    process.env.G2BULK_API_KEY = originalG2bulkApiKey
  }
})

describe("POST /api/jobs/p2p", () => {
  it("returns 503 when JOBS_SECRET is unset/empty", async () => {
    delete process.env.JOBS_SECRET

    const response = await POST(new NextRequest("http://localhost/api/jobs/p2p", { method: "POST" }))

    expect(response.status).toBe(503)
    await expect(response.text()).resolves.toBe("jobs secret not configured")
    expect(readMock).not.toHaveBeenCalled()
  })

  it("returns 401 when the x-jobs-secret header is missing", async () => {
    const response = await POST(new NextRequest("http://localhost/api/jobs/p2p", { method: "POST" }))

    expect(response.status).toBe(401)
    expect(response.body).toBeNull()
    expect(readMock).not.toHaveBeenCalled()
  })

  it("returns 401 when the x-jobs-secret header is wrong", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/jobs/p2p", {
        method: "POST",
        headers: { "x-jobs-secret": "wrong" },
      }),
    )

    expect(response.status).toBe(401)
    expect(readMock).not.toHaveBeenCalled()
  })

  it("returns 200 with the correct secret and calls p2pRate.read once", async () => {
    readMock.mockResolvedValue({
      egpPerUsdtMinor: 4850,
      fetchedAt: "2026-11-07T10:00:00.000Z",
      source: "binance-p2p",
      stale: false,
    })

    const response = await POST(
      new NextRequest("http://localhost/api/jobs/p2p", {
        method: "POST",
        headers: { "x-jobs-secret": "test-secret" },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: true,
      fetchedAt: "2026-11-07T10:00:00.000Z",
      source: "binance-p2p",
      stale: false,
      egpPerUsdtMinor: 4850,
    })
    expect(readMock).toHaveBeenCalledTimes(1)
  })

  it("returns 200 with ok false and nullable fields when read resolves null", async () => {
    readMock.mockResolvedValue(null)

    const response = await POST(
      new NextRequest("http://localhost/api/jobs/p2p", {
        method: "POST",
        headers: { "x-jobs-secret": "test-secret" },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      fetchedAt: null,
      source: null,
      stale: null,
      egpPerUsdtMinor: null,
    })
    expect(readMock).toHaveBeenCalledTimes(1)
  })
})
