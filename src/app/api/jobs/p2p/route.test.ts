import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const readMock = vi.fn()
const getMock = vi.fn()

vi.mock("@/api/container", () => {
  const settings = {
    get: (...args: unknown[]) => getMock(...args),
  }
  return {
    getContainer: () => ({
      p2pRate: {
        read: (...args: unknown[]) => readMock(...args),
      },
      settings,
    }),
    readP2pToday: async () => {
      const raw = await getMock("rate:usdt:p2p:today")
      if (typeof raw !== "string") return null
      try {
        return { snapshot: JSON.parse(raw), stale: false }
      } catch {
        return null
      }
    },
  }
})

const { POST } = await import("./route")

const originalJobsSecret = process.env.JOBS_SECRET
const originalG2bulkApiKey = process.env.G2BULK_API_KEY

beforeEach(() => {
  vi.clearAllMocks()
  getMock.mockResolvedValue(null)
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
      today: null,
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
      today: null,
    })
    expect(readMock).toHaveBeenCalledTimes(1)
  })

  it("returns the today block from the Cairo-day snapshot", async () => {
    readMock.mockResolvedValue({
      egpPerUsdtMinor: 4850,
      fetchedAt: "2026-11-07T10:00:00.000Z",
      source: "binance-p2p",
      stale: false,
    })
    getMock.mockImplementation(async (key: string) => {
      if (key === "rate:usdt:p2p:today") {
        return JSON.stringify({
          day: "2026-11-07",
          minEgpPerUsdtMinor: 4700,
          maxEgpPerUsdtMinor: 4900,
          avgEgpPerUsdtMinor: 4800,
          currentEgpPerUsdtMinor: 4850,
          offerCount: 10,
          priceSumMinor: 48000,
          sumSquaresMinor: 230500000,
          stdDevEgpPerUsdtMinor: 60,
          outlierCount: 1,
          updatedAt: "2026-11-07T10:00:00.000Z",
        })
      }
      if (key === "rate:usdt:p2p:sync_interval_seconds") return "300"
      return null
    })

    const response = await POST(
      new NextRequest("http://localhost/api/jobs/p2p", {
        method: "POST",
        headers: { "x-jobs-secret": "test-secret" },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      egpPerUsdtMinor: 4850,
      today: {
        minEgpPerUsdtMinor: 4700,
        maxEgpPerUsdtMinor: 4900,
        avgEgpPerUsdtMinor: 4800,
        currentEgpPerUsdtMinor: 4850,
      },
    })
  })
})
