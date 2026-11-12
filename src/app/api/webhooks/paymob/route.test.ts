import { beforeEach, describe, expect, it, vi } from "vitest"
import { createHmac } from "node:crypto"
import { money } from "@/shared/money"
import { paymobHmacPayload } from "@/integration/paymob/webhook-signature"

const webhookRecordMock = vi.fn()
const paymentsFindByProviderReferenceMock = vi.fn()
const confirmPaymentMock = vi.fn()
const fulfilOrderMock = vi.fn()

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    webhookEvents: { record: (...args: unknown[]) => webhookRecordMock(...args) },
    payments: {
      findByProviderReference: (...args: unknown[]) => paymentsFindByProviderReferenceMock(...args),
    },
    confirmPayment: (...args: unknown[]) => confirmPaymentMock(...args),
    fulfilOrder: (...args: unknown[]) => fulfilOrderMock(...args),
  }),
}))

const { POST } = await import("./route")

const secret = "test-paymob-hmac-secret"
const fixture = {
  amount_cents: 15000,
  created_at: "2026-11-11T10:00:00.000000Z",
  currency: "EGP",
  error_occured: false,
  has_parent_transaction: false,
  id: 555001,
  integration_id: 1001,
  is_3d_secure: false,
  is_auth: false,
  is_capture: true,
  is_refunded: false,
  is_standalone_payment: true,
  is_voided: false,
  order: { id: 9001, merchant_order_id: "pm-ref-1" },
  owner: 7,
  pending: false,
  source_data: { pan: "111111", sub_type: "Visa", type: "card" },
  success: true,
}

function sign(t: Record<string, unknown> = fixture): string {
  return createHmac("sha512", secret).update(paymobHmacPayload(t)).digest("hex")
}

function request(t: Record<string, unknown> = fixture, hmac?: string): Request {
  const value = hmac === undefined ? sign(t) : hmac
  const url = value === null ? "http://localhost/api/webhooks/paymob" : `http://localhost/api/webhooks/paymob?hmac=${encodeURIComponent(value)}`
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ obj: t }),
  })
}

const payment = { id: "p1", orderId: "o1", provider: "PAYMOB", providerReference: "pm-ref-1", amount: money(15000, "EGP"), status: "PENDING" }
const paidOrder = { id: "o1", status: "PAID" }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PAYMOB_HMAC_SECRET = secret
  process.env.G2BULK_API_KEY = process.env.G2BULK_API_KEY || "test-key"
  webhookRecordMock.mockResolvedValue(true)
  paymentsFindByProviderReferenceMock.mockResolvedValue(payment)
  confirmPaymentMock.mockResolvedValue(paidOrder)
  fulfilOrderMock.mockResolvedValue(undefined)
})

describe("POST /api/webhooks/paymob", () => {
  it("confirms PAID on valid HMAC + success true and returns 200", async () => {
    const res = await POST(request({ ...fixture, success: true }))
    expect(res.status).toBe(200)
    expect(confirmPaymentMock).toHaveBeenCalledWith({ provider: "PAYMOB", reference: "pm-ref-1", status: "PAID" })
    expect(fulfilOrderMock).toHaveBeenCalledWith(paidOrder)
  })

  it("confirms FAILED on valid HMAC + success false and returns 200", async () => {
    confirmPaymentMock.mockResolvedValue({ id: "o1", status: "FAILED" })
    const res = await POST(request({ ...fixture, success: false }))
    expect(res.status).toBe(200)
    expect(confirmPaymentMock).toHaveBeenCalledWith({ provider: "PAYMOB", reference: "pm-ref-1", status: "FAILED" })
    expect(fulfilOrderMock).not.toHaveBeenCalled()
  })

  it("returns 401 on invalid HMAC and never confirms", async () => {
    const res = await POST(request(fixture, "deadbeef"))
    expect(res.status).toBe(401)
    expect(confirmPaymentMock).not.toHaveBeenCalled()
    expect(webhookRecordMock).not.toHaveBeenCalled()
  })

  it("reprocesses a duplicate delivery and still confirms (idempotent)", async () => {
    webhookRecordMock.mockResolvedValue(false)
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(confirmPaymentMock).toHaveBeenCalledWith({ provider: "PAYMOB", reference: "pm-ref-1", status: "PAID" })
    expect(webhookRecordMock).toHaveBeenCalledWith("paymob", "555001", expect.anything())
  })

  it("returns 400 amount mismatch when amount_cents differs and never confirms", async () => {
    const res = await POST(request({ ...fixture, amount_cents: 999 }))
    expect(res.status).toBe(400)
    await expect(res.text()).resolves.toBe("amount mismatch")
    expect(confirmPaymentMock).not.toHaveBeenCalled()
  })

  it("returns 400 when hmac query param is missing", async () => {
    const res = await POST(new Request("http://localhost/api/webhooks/paymob", { method: "POST", body: JSON.stringify({ obj: fixture }) }))
    expect(res.status).toBe(400)
    await expect(res.text()).resolves.toBe("missing hmac")
  })

  it("returns 404 when reference payment is unknown", async () => {
    paymentsFindByProviderReferenceMock.mockResolvedValue(null)
    const res = await POST(request())
    expect(res.status).toBe(404)
    expect(confirmPaymentMock).not.toHaveBeenCalled()
  })
})
