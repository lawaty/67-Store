import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const pollMock = vi.fn()
const retryFailedRefundsMock = vi.fn()

vi.mock("@/jobs", () => ({
  createPollOrders: vi.fn(() => pollMock),
}))

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    orders: {},
    syncFulfilment: vi.fn(),
    retryFailedRefunds: (...args: unknown[]) => retryFailedRefundsMock(...args),
  }),
}))

const { POST } = await import("./route")

const originalJobsSecret = process.env.JOBS_SECRET
const originalG2bulkApiKey = process.env.G2BULK_API_KEY

beforeEach(() => {
  vi.clearAllMocks()
  process.env.G2BULK_API_KEY = "test-g2bulk-key"
  process.env.JOBS_SECRET = "test-secret"
  pollMock.mockResolvedValue({ checked: 2, updated: 1, failed: 0 })
  retryFailedRefundsMock.mockResolvedValue({ checked: 0, refunded: 0, failed: 0 })
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

describe("POST /api/jobs/poll", () => {
  it("returns 401 when the x-jobs-secret header is missing or wrong", async () => {
    const missing = await POST(new NextRequest("http://localhost/api/jobs/poll", { method: "POST" }))
    expect(missing.status).toBe(401)

    const wrong = await POST(
      new NextRequest("http://localhost/api/jobs/poll", {
        method: "POST",
        headers: { "x-jobs-secret": "wrong" },
      }),
    )
    expect(wrong.status).toBe(401)
    expect(pollMock).not.toHaveBeenCalled()
  })

  it("returns 200 with poll result and refundRetries", async () => {
    retryFailedRefundsMock.mockResolvedValue({ checked: 2, refunded: 1, failed: 1 })

    const response = await POST(
      new NextRequest("http://localhost/api/jobs/poll", {
        method: "POST",
        headers: { "x-jobs-secret": "test-secret" },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      checked: 2,
      updated: 1,
      failed: 0,
      refundRetries: { checked: 2, refunded: 1, failed: 1 },
    })
    expect(pollMock).toHaveBeenCalledTimes(1)
  })
})
