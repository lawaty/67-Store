import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const expirePaymentsMock = vi.fn()

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    expirePayments: (...args: unknown[]) => expirePaymentsMock(...args),
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

describe("POST /api/jobs/expire-payments", () => {
  it("returns 503 when JOBS_SECRET is unset/empty", async () => {
    delete process.env.JOBS_SECRET

    const response = await POST(new NextRequest("http://localhost/api/jobs/expire-payments", { method: "POST" }))

    expect(response.status).toBe(503)
    await expect(response.text()).resolves.toBe("jobs secret not configured")
    expect(expirePaymentsMock).not.toHaveBeenCalled()
  })

  it("returns 401 when the x-jobs-secret header is missing or wrong", async () => {
    const missing = await POST(new NextRequest("http://localhost/api/jobs/expire-payments", { method: "POST" }))
    expect(missing.status).toBe(401)

    const wrong = await POST(
      new NextRequest("http://localhost/api/jobs/expire-payments", {
        method: "POST",
        headers: { "x-jobs-secret": "wrong" },
      }),
    )
    expect(wrong.status).toBe(401)
    expect(expirePaymentsMock).not.toHaveBeenCalled()
  })

  it("returns 200 with the correct secret and calls expirePayments once", async () => {
    expirePaymentsMock.mockResolvedValue({ expired: 3 })

    const response = await POST(
      new NextRequest("http://localhost/api/jobs/expire-payments", {
        method: "POST",
        headers: { "x-jobs-secret": "test-secret" },
      }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ expired: 3 })
    expect(expirePaymentsMock).toHaveBeenCalledTimes(1)
  })
})
