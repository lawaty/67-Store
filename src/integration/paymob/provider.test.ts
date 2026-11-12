import { describe, expect, it, vi } from "vitest"
import { money } from "@/shared/money"
import { PaymentError } from "@/payments"
import { createPaymobProvider } from "./provider"
import { CreateIntentionInput, Intention } from "./client"

function stubClient(intention: Intention = { id: "intent-1", clientSecret: "secret", checkoutUrl: "https://paymob.test/checkout" }) {
  const calls: CreateIntentionInput[] = []
  const client = {
    createIntention: vi.fn(async (input: CreateIntentionInput) => {
      calls.push(input)
      return intention
    }),
  }
  return { client, calls }
}

describe("paymob-provider", () => {
  it('name === "PAYMOB"', () => {
    const { client } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })
    expect(provider.name).toBe("PAYMOB")
  })

  it("charges in EGP and returns the generated reference", async () => {
    const { client, calls } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-123",
      paymentMethods: async () => [123, 456],
    })

    const result = await provider.charge({
      orderId: "o1",
      amount: money(1500, "EGP"),
      returnUrl: "/order/t1",
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].amountMinor).toBe(1500)
    expect(calls[0].currency).toBe("EGP")
    expect(calls[0].reference).toBe("ref-123")
    expect(calls[0].paymentMethods).toEqual([123, 456])
    expect(result.providerReference).toBe("ref-123")
  })

  it("notificationUrl is <appUrl>/api/webhooks/paymob and returnUrl is absolute for relative path", async () => {
    const { client, calls } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })

    await provider.charge({ orderId: "o1", amount: money(100, "EGP"), returnUrl: "/order/tok" })

    expect(calls[0].notificationUrl).toBe("https://app.test/api/webhooks/paymob")
    expect(calls[0].returnUrl).toBe("https://app.test/order/tok")
  })

  it("a trailing slash on appUrl does not produce //", async () => {
    const { client, calls } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test/",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })

    await provider.charge({ orderId: "o1", amount: money(100, "EGP"), returnUrl: "/order/tok" })

    expect(calls[0].notificationUrl).toBe("https://app.test/api/webhooks/paymob")
    expect(calls[0].returnUrl).toBe("https://app.test/order/tok")
  })

  it("an already-absolute returnUrl is passed through unchanged", async () => {
    const { client, calls } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })

    await provider.charge({ orderId: "o1", amount: money(100, "EGP"), returnUrl: "https://other.test/cb" })

    expect(calls[0].returnUrl).toBe("https://other.test/cb")
  })

  it("non-EGP amount throws PaymentError", async () => {
    const { client } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })

    await expect(
      provider.charge({ orderId: "o1", amount: money(100, "USD"), returnUrl: "/order/tok" })
    ).rejects.toBeInstanceOf(PaymentError)
  })

  it("empty appUrl throws PaymentError and the client is not called", async () => {
    const { client, calls } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "   ",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })

    await expect(
      provider.charge({ orderId: "o1", amount: money(100, "EGP"), returnUrl: "/order/tok" })
    ).rejects.toBeInstanceOf(PaymentError)
    expect(calls).toHaveLength(0)
    expect(client.createIntention).not.toHaveBeenCalled()
  })

  it("empty payment methods throws PaymentError and the client is not called", async () => {
    const { client, calls } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-1",
      paymentMethods: async () => [],
    })

    await expect(
      provider.charge({ orderId: "o1", amount: money(100, "EGP"), returnUrl: "/order/tok" })
    ).rejects.toThrow(new PaymentError("No Paymob payment method is enabled"))
    expect(calls).toHaveLength(0)
  })

  it("verify rejects with PaymentError", async () => {
    const { client } = stubClient()
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })

    await expect(provider.verify("any-ref")).rejects.toBeInstanceOf(PaymentError)
  })

  it("redirectUrl equals the checkoutUrl returned by the client", async () => {
    const intention = { id: "intent-9", clientSecret: "s", checkoutUrl: "https://paymob.test/checkout/abc" }
    const { client } = stubClient(intention)
    const provider = createPaymobProvider({
      client,
      appUrl: "https://app.test",
      newReference: () => "ref-1",
      paymentMethods: async () => [123],
    })

    const result = await provider.charge({ orderId: "o1", amount: money(100, "EGP"), returnUrl: "/order/tok" })

    expect(result.redirectUrl).toBe("https://paymob.test/checkout/abc")
  })
})
