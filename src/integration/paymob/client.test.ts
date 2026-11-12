import { describe, expect, it } from "vitest"
import { createPaymobClient, PaymobError } from "./client"

describe("paymob client", () => {
  const config = {
    baseUrl: "https://accept.paymob.com",
    secretKey: "sk_test",
    publicKey: "pk_test",
  }

  it("posts to the right URL with the Token header and JSON content type", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 201, text: async () => JSON.stringify({ id: "int_1", client_secret: "cs_1" }) }
    }
    const client = createPaymobClient({ ...config, fetch: fetchStub as any })
    await client.createIntention({
      amountMinor: 5000,
      currency: "EGP",
      reference: "ref-1",
      returnUrl: "https://store.test/return",
      notificationUrl: "https://store.test/webhook",
      paymentMethods: [123, 456],
    })
    expect(calls[0].url).toBe("https://accept.paymob.com/v1/intention/")
    expect(calls[0].init.headers["Authorization"]).toBe("Token sk_test")
    expect(calls[0].init.headers["Content-Type"]).toBe("application/json")
  })

  it("body has amount in minor units, currency, payment_methods, references, urls, and billing_data.country EG", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 201, text: async () => JSON.stringify({ id: "int_1", client_secret: "cs_1" }) }
    }
    const client = createPaymobClient({ ...config, fetch: fetchStub as any })
    await client.createIntention({
      amountMinor: 5000,
      currency: "EGP",
      reference: "ref-1",
      returnUrl: "https://store.test/return",
      notificationUrl: "https://store.test/webhook",
      email: "user@example.com",
      paymentMethods: [123, 456],
    })
    const body = JSON.parse(calls[0].init.body)
    expect(body.amount).toBe(5000)
    expect(body.currency).toBe("EGP")
    expect(body.payment_methods).toEqual([123, 456])
    expect(body.special_reference).toBe("ref-1")
    expect(body.extras.reference).toBe("ref-1")
    expect(body.notification_url).toBe("https://store.test/webhook")
    expect(body.redirection_url).toBe("https://store.test/return")
    expect(body.billing_data.country).toBe("EG")
    expect(body.billing_data.email).toBe("user@example.com")
    expect(body.customer.email).toBe("user@example.com")
    expect(body.items).toEqual([{ name: "Digital top-up", amount: 5000, quantity: 1 }])
  })

  it("builds checkoutUrl as <base>/unifiedcheckout/?publicKey=<pk>&clientSecret=<cs> with values URL-encoded", async () => {
    const fetchStub = async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: "int_1", client_secret: "cs/secret+val" }),
    })
    const client = createPaymobClient({ ...config, publicKey: "pk/test+val", fetch: fetchStub as any })
    const res = await client.createIntention({
      amountMinor: 5000,
      currency: "EGP",
      reference: "ref-1",
      returnUrl: "https://store.test/return",
      notificationUrl: "https://store.test/webhook",
      paymentMethods: [123],
    })
    expect(res.checkoutUrl).toBe(
      "https://accept.paymob.com/unifiedcheckout/?publicKey=pk%2Ftest%2Bval&clientSecret=cs%2Fsecret%2Bval",
    )
  })

  it("normalises a base URL given with a trailing slash (no double slash)", async () => {
    const calls: any[] = []
    const fetchStub = async (url: string, init: any) => {
      calls.push({ url, init })
      return { ok: true, status: 201, text: async () => JSON.stringify({ id: "int_1", client_secret: "cs_1" }) }
    }
    const client = createPaymobClient({ ...config, baseUrl: "https://accept.paymob.com/", fetch: fetchStub as any })
    const res = await client.createIntention({
      amountMinor: 5000,
      currency: "EGP",
      reference: "ref-1",
      returnUrl: "https://store.test/return",
      notificationUrl: "https://store.test/webhook",
      paymentMethods: [123],
    })
    expect(calls[0].url).toBe("https://accept.paymob.com/v1/intention/")
    expect(res.checkoutUrl.startsWith("https://accept.paymob.com/unifiedcheckout/")).toBe(true)
  })

  it("numeric id from the response becomes a string", async () => {
    const fetchStub = async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: 98765, client_secret: "cs_1" }),
    })
    const client = createPaymobClient({ ...config, fetch: fetchStub as any })
    const res = await client.createIntention({
      amountMinor: 5000,
      currency: "EGP",
      reference: "ref-1",
      returnUrl: "https://store.test/return",
      notificationUrl: "https://store.test/webhook",
      paymentMethods: [123],
    })
    expect(res.id).toBe("98765")
  })

  it("non-ok response throws PaymobError carrying the status and an excerpt of the body", async () => {
    const fetchStub = async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: "Bad request details" }),
    })
    const client = createPaymobClient({ ...config, fetch: fetchStub as any })
    const err: any = await client
      .createIntention({
        amountMinor: 5000,
        currency: "EGP",
        reference: "ref-1",
        returnUrl: "https://store.test/return",
        notificationUrl: "https://store.test/webhook",
        paymentMethods: [123],
      })
      .catch((e) => e)
    expect(err).toBeInstanceOf(PaymobError)
    expect(err).toMatchObject({ status: 400 })
    expect(err.message).toContain("Paymob intention failed with status 400")
    expect(err.message).toContain("Bad request details")
  })

  it("missing client_secret throws", async () => {
    const fetchStub = async () => ({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ id: "int_1" }),
    })
    const client = createPaymobClient({ ...config, fetch: fetchStub as any })
    await expect(
      client.createIntention({
        amountMinor: 5000,
        currency: "EGP",
        reference: "ref-1",
        returnUrl: "https://store.test/return",
        notificationUrl: "https://store.test/webhook",
        paymentMethods: [123],
      }),
    ).rejects.toMatchObject({ status: 502, message: "Paymob intention response missing client_secret" })
  })

  it("empty paymentMethods throws without calling fetch", async () => {
    let called = false
    const fetchStub = async () => {
      called = true
      return { ok: true, status: 201, text: async () => JSON.stringify({ id: "int_1", client_secret: "cs_1" }) }
    }
    const client = createPaymobClient({ ...config, fetch: fetchStub as any })
    await expect(
      client.createIntention({
        amountMinor: 5000,
        currency: "EGP",
        reference: "ref-1",
        returnUrl: "https://store.test/return",
        notificationUrl: "https://store.test/webhook",
        paymentMethods: [],
      }),
    ).rejects.toMatchObject({ status: 500, message: "Paymob integration id is not configured" })
    expect(called).toBe(false)
  })
})
