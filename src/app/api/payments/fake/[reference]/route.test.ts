import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { money } from "@/shared/money"

const paymentsFindByProviderReferenceMock = vi.fn()
const ordersFindByIdMock = vi.fn()
const walletFindByReferenceMock = vi.fn()
const confirmPaymentMock = vi.fn()
const fulfilOrderMock = vi.fn()
const settleWalletFundingMock = vi.fn()
const fakePaymentsEnabledMock = vi.fn()
const fakeFulfilmentEnabledMock = vi.fn()
const fakeRailsEnabledMock = vi.fn()

vi.mock("@/api/container", () => ({
  getContainer: () => ({
    fakePaymentsEnabled: (...args: unknown[]) => fakePaymentsEnabledMock(...args),
    fakeFulfilmentEnabled: (...args: unknown[]) => fakeFulfilmentEnabledMock(...args),
    fakeRailsEnabled: (...args: unknown[]) => fakeRailsEnabledMock(...args),
    payments: {
      findByProviderReference: (...args: unknown[]) => paymentsFindByProviderReferenceMock(...args),
      saveIfAbsent: async () => true,
    },
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
  provider: "PAYMOB",
  providerReference: "fake_paymob_o1",
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
  provider: "PAYMOB",
  providerReference: "fake_paymob_fund_f1",
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
  fakePaymentsEnabledMock.mockResolvedValue(true)
  fakeFulfilmentEnabledMock.mockReturnValue(true)
  fakeRailsEnabledMock.mockReturnValue(true)
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

    const response = await getPayment("fake_paymob_o1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      amount: money(1000, "USD"),
      provider: "PAYMOB",
      purpose: "order",
    })
    expect(paymentsFindByProviderReferenceMock).toHaveBeenCalledWith("PAYMOB", "fake_paymob_o1")
  })

  it("returns the funding view as amount, provider and purpose", async () => {
    walletFindByReferenceMock.mockResolvedValue(fakeFunding)

    const response = await getPayment("fake_paymob_fund_f1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      amount: money(10000, "EGP"),
      provider: "PAYMOB",
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

    const response = await postPayment("fake_paymob_o1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(confirmPaymentMock).toHaveBeenCalledWith({
      provider: "PAYMOB",
      reference: "fake_paymob_o1",
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

    const response = await postPayment("fake_paymob_fund_f1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, redirectUrl: "/account?tab=wallet&funded=1" })
    expect(settleWalletFundingMock).toHaveBeenCalledTimes(1)
    expect(settleWalletFundingMock).toHaveBeenCalledWith({ providerReference: "fake_paymob_fund_f1" })
    expect(confirmPaymentMock).not.toHaveBeenCalled()
    expect(fulfilOrderMock).not.toHaveBeenCalled()
  })

  it("returns 400 when the view is null", async () => {
    const response = await postPayment("missing")

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
  })
})

describe("fake rails disabled", () => {
  it("GET returns 404 and does not read the fake payment", async () => {
    fakeRailsEnabledMock.mockReturnValue(false)

    const response = await getPayment("fake_paymob_o1")

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
    expect(paymentsFindByProviderReferenceMock).not.toHaveBeenCalled()
    expect(walletFindByReferenceMock).not.toHaveBeenCalled()
    expect(ordersFindByIdMock).not.toHaveBeenCalled()
  })

  it("POST returns 404 and does not confirm the fake payment", async () => {
    fakeRailsEnabledMock.mockReturnValue(false)

    const response = await postPayment("fake_paymob_o1")

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "not_found" })
    expect(paymentsFindByProviderReferenceMock).not.toHaveBeenCalled()
    expect(walletFindByReferenceMock).not.toHaveBeenCalled()
    expect(confirmPaymentMock).not.toHaveBeenCalled()
    expect(fulfilOrderMock).not.toHaveBeenCalled()
    expect(settleWalletFundingMock).not.toHaveBeenCalled()
  })
})

describe("with fake payments enabled", () => {
  it("GET returns the amount/provider/purpose JSON", async () => {
    fakePaymentsEnabledMock.mockResolvedValue(true)
    paymentsFindByProviderReferenceMock.mockResolvedValue(fakePayment)
    ordersFindByIdMock.mockResolvedValue(fakeOrder)

    const response = await getPayment("fake_paymob_o1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      amount: money(1000, "USD"),
      provider: "PAYMOB",
      purpose: "order",
    })
  })

  it("POST confirms and calls fulfilOrder with the order", async () => {
    fakePaymentsEnabledMock.mockResolvedValue(true)
    paymentsFindByProviderReferenceMock.mockResolvedValue(fakePayment)
    ordersFindByIdMock.mockResolvedValue(fakeOrder)
    confirmPaymentMock.mockResolvedValue(fakeOrder)

    const response = await postPayment("fake_paymob_o1")

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true, redirectUrl: "/order/t1" })
    expect(confirmPaymentMock).toHaveBeenCalledWith({
      provider: "PAYMOB",
      reference: "fake_paymob_o1",
      status: "PAID",
    })
    expect(fulfilOrderMock).toHaveBeenCalledWith(fakeOrder)
  })
})
