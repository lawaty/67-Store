/**
 * Translates Paymob intention creation HTTP API for hosted checkout.
 */

export type PaymobFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{
  ok: boolean
  status: number
  text(): Promise<string>
}>

export type PaymobConfig = { baseUrl: string; secretKey: string; publicKey: string }

export type CreateIntentionInput = {
  amountMinor: number
  currency: string
  reference: string
  returnUrl: string
  notificationUrl: string
  email?: string
  paymentMethods: readonly number[]
}

export type Intention = { id: string; clientSecret: string; checkoutUrl: string }

export class PaymobError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  if (baseUrl.endsWith("/")) {
    return baseUrl.slice(0, -1)
  }
  return baseUrl
}

function extractMessage(text: string): string {
  try {
    const body = JSON.parse(text) as unknown
    if (typeof body === "object" && body !== null) {
      const b = body as Record<string, unknown>
      if (typeof b.message === "string") return b.message
      if (typeof b.detail === "string") return b.detail
    }
  } catch {
    // fall through to raw text
  }
  return text
}

function truncate(message: string): string {
  if (message.length <= 200) return message
  return message.slice(0, 200)
}

export function createPaymobClient(options: PaymobConfig & { fetch?: PaymobFetch }): { createIntention(input: CreateIntentionInput): Promise<Intention> } {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const fetchImpl = options.fetch ?? (globalThis.fetch as PaymobFetch)

  return {
    async createIntention(input: CreateIntentionInput): Promise<Intention> {
      if (input.paymentMethods.length === 0) {
        throw new PaymobError(500, "Paymob integration id is not configured")
      }

      const email = input.email ?? "customer@67-store.online"
      const res = await fetchImpl(`${baseUrl}/v1/intention/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Token ${options.secretKey}`,
        },
        body: JSON.stringify({
          amount: input.amountMinor,
          currency: input.currency,
          payment_methods: input.paymentMethods,
          items: [{ name: "Digital top-up", amount: input.amountMinor, quantity: 1 }],
          billing_data: {
            first_name: "NA",
            last_name: "NA",
            email,
            phone_number: "NA",
            street: "NA",
            building: "NA",
            floor: "NA",
            apartment: "NA",
            city: "NA",
            state: "NA",
            country: "EG",
            postal_code: "NA",
            shipping_method: "NA",
          },
          customer: { first_name: "NA", last_name: "NA", email },
          extras: { reference: input.reference },
          special_reference: input.reference,
          notification_url: input.notificationUrl,
          redirection_url: input.returnUrl,
        }),
      })

      const text = await res.text()
      if (!res.ok) {
        throw new PaymobError(res.status, `Paymob intention failed with status ${res.status}: ${truncate(extractMessage(text))}`)
      }

      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        throw new PaymobError(502, "Paymob intention response missing client_secret")
      }

      if (typeof body !== "object" || body === null) {
        throw new PaymobError(502, "Paymob intention response missing client_secret")
      }
      const b = body as Record<string, unknown>
      if (typeof b.client_secret !== "string") {
        throw new PaymobError(502, "Paymob intention response missing client_secret")
      }

      const rawId = b.id
      const id = typeof rawId === "string" ? rawId : typeof rawId === "number" ? String(rawId) : undefined
      if (id === undefined) {
        throw new PaymobError(502, "Paymob intention response missing client_secret")
      }

      const clientSecret = b.client_secret
      const checkoutUrl = `${baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(options.publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`
      return { id, clientSecret, checkoutUrl }
    },
  }
}
