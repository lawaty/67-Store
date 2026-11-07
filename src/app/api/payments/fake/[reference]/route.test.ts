import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { money } from "@/shared/money"

const paymentsFindByProviderReferenceMock = vi.fn()
const ordersFindByIdMock = vi.fn()
const walletFindByReferenceMock = vi.fn()
const confirmPaymentMock = vi.fn()
const fulfilOrderMock = vi.fn()
const settleWalletFundingMock = vi.fn()
const operationsModeMock = vi.fn()

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    operationsMode: (...args: unknown[]) => operationsModeMock(...args),
    payments: { findByProviderReference: (...args: unknown[]) => paymentsFindByProviderReferenceMock(...args) },
    orders: { findById: (...args: unknown[]) => ordersFindByIdMock(...args) },
    walletFundings: { findByReference: (...args: unknown[]) => walletFindByReferenceMock(...args) },
    confirmPayment: (...args: unknown[]) => confirmPaymentMock(...args),
    fulfilOrder: (...args: unknown[]) => fulfilOrderMock(...args),
    settleWalletFunding: (...args: unknown[]) => settleWalletFundingMock(...args),
  }),
}))

const { GET, POST } = await import("./route")

const fakePayment = {
  id: "p1",
  orderId: "o1",
  provider: "INSTAPAY",
  providerReference: "fake_instapay_o1",
  amount: money(1000, "USD"),
  status: "PENDING",
}

const fakeOrder = {
  id: "o1",
  token: "t1",
  status: "PAID",
}

const fakeFunding = {
  id: "f1",
  clientId: "c1",
  currency: "EGP",
  amountMinor: 10000,
  provider: "INSTAPAY",
  providerReference: "fake_instapay_fund_f1",
  status: "PENDING",
}

function getPayment(reference: string): Promise<Response> {
  return GET(new NextRequest(`http://localhost/api/payments/fake/${encodeURIComponent(reference)}`, { method: "GET" }), {
    params: Promise.resolve({ reference }),
  })
}

function postPayment(reference: string): Promise<Response> {
  return POST(
    new NextRequest(`http://localhost/api/payments/fake/${encodeURIComponent(reference)}`, { method: "POST" }),
    { params: Promise.resolve({ reference }) },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  operationsModeMock.mockResolvedValue("sandbox")
  paymentsFindByProviderReferenceMock.mockResolvedValue(null)
  ordersFindByIdMock.mockResolvedValue(null)
  walletFindByReferenceMock.mockResolvedValue(null)
  confirmPaymentMock.mockResolvedValue(null)
  fulfilOrderMock.mockResolvedValue(undefined)
  settleWalletFundingMock.mockResolvedValue({ ok: false, error: "not_found" })
})

describe("GET /api/payments/fake/[reference]", () => {
  it("returns the order view as amount, provider and purpose", async () => {
    paymentsFindByProviderReferenceMock.mockResolvedValue(fakePayment)
    ordersFindByIdMock.mockResolvedValue(fakeOrder)

    const response = await getPayment("fake_instapay_o1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      amount: money(1000, "USD"),
      provider: "INSTAPAY",
      purpose: "order",
    })
    expect(paymentsFindByProviderReferenceMock).toHaveBeenCalledWith("INSTAPAY", "fake_instapay_o1")
  })

  it("returns the funding view as amount, provider and purpose", async () => {
    walletFindByReferenceMock.mockResolvedValue(fakeFunding)

    const response = await getPayment("fake_instapay_fund_f1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      amount: money(10000, "EGP"),
      provider: "INSTAPAY",
      purpose: "funding",
    })
  })

  it("returns 404 when the view is null", async () => {
    const response = await getPayment("missing")

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
  })
})

describe("POST /api/payments/fake/[reference]", () => {
  it("confirms an order and returns the order redirect", async () => {
    paymentsFindByProviderReferenceMock.mockResolvedValue(fakePayment)
    ordersFindByIdMock.mockResolvedValue(fakeOrder)
    confirmPaymentMock.mockResolvedValue(fakeOrder)

    const response = await postPayment("fake_instapay_o1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(confirmPaymentMock).toHaveBeenCalledWith({
      provider: "INSTAPAY",
      reference: "fake_instapay_o1",
      status: "PAID",
    })
    expect(fulfilOrderMock).toHaveBeenCalledWith(fakeOrder)
    expect(settleWalletFundingMock).not.toHaveBeenCalled()
  })

  it("settles a funding and returns the account redirect", async () => {
    walletFindByReferenceMock.mockResolvedValue(fakeFunding)
    settleWalletFundingMock.mockResolvedValue({
      ok: true,
      funding: fakeFunding,
      depositId: null,
      alreadySettled: false,
    })

    const response = await postPayment("fake_instapay_fund_f1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, redirectUrl: "/account?tab=wallet&funded=1" })
    expect(settleWalletFundingMock).toHaveBeenCalledTimes(1)
    expect(settleWalletFundingMock).toHaveBeenCalledWith({ providerReference: "fake_instapay_fund_f1" })
    expect(confirmPaymentMock).not.toHaveBeenCalled()
    expect(fulfilOrderMock).not.toHaveBeenCalled()
  })

  it("returns 400 when the view is null", async () => {
    const response = await postPayment("missing")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
  })
})

describe("live operations mode", () => {
  it("GET returns 404 in live and does not read the fake payment", async () => {
    operationsModeMock.mockResolvedValue("live")

    const response = await getPayment("fake_instapay_o1")

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
    expect(paymentsFindByProviderReferenceMock).not.toHaveBeenCalled()
    expect(walletFindByReferenceMock).not.toHaveBeenCalled()
    expect(ordersFindByIdMock).not.toHaveBeenCalled()
  })

  it("POST returns 400 in live and does not confirm the fake payment", async () => {
    operationsModeMock.mockResolvedValue("live")

    const response = await postPayment("fake_instapay_o1")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "disabled" })
    expect(paymentsFindByProviderReferenceMock).not.toHaveBeenCalled()
    expect(walletFindByReferenceMock).not.toHaveBeenCalled()
    expect(confirmPaymentMock).not.toHaveBeenCalled()
    expect(fulfilOrderMock).not.toHaveBeenCalled()
    expect(settleWalletFundingMock).not.toHaveBeenCalled()
  })
})
