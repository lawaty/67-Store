/**
 * Translates the Binance P2P advert search API into the treasury's P2P quote
 * provider, returning parsed rate quotes or normalized P2P errors.
 */
import { FetchLike } from "@/shared/fetch"
import { P2pQuoteProvider, P2pRateError } from "@/treasury"
import { p2pMethodQuoteFromAds } from "./quote"

export type { FetchLike }

export const BINANCE_P2P_DEFAULT_BASE_URL = "https://p2p.binance.com"

function normalizeBaseUrl(baseUrl: string): string {
  if (baseUrl.endsWith("/")) {
    return baseUrl.slice(0, -1)
  }
  return baseUrl
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>
    if (typeof b.message === "string") {
      return b.message
    }
    if (typeof b.msg === "string") {
      return b.msg
    }
  }
  return undefined
}

export function createBinanceP2p(options: { baseUrl?: string; fetch?: FetchLike; now?: () => string } = {}): P2pQuoteProvider {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? BINANCE_P2P_DEFAULT_BASE_URL)
  const fetchImpl = options.fetch ?? ((globalThis.fetch as FetchLike))
  const nowFn = options.now ?? (() => new Date().toISOString())

  return {
    async readQuote(options) {
      const fetchedAt = nowFn()
      const res = await fetchImpl(`${baseUrl}/bapi/c2c/v2/friendly/c2c/adv/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ asset: "USDT", fiat: "EGP", tradeType: "BUY", page: 1, rows: 20 }),
      })
      let body: unknown
      try {
        body = await res.json()
      } catch (e) {
        if (!res.ok) {
          throw new P2pRateError(res.status, extractMessage(body) ?? `Binance P2P request failed with status ${res.status}`)
        }
        throw e
      }
      if (!res.ok) {
        throw new P2pRateError(res.status, extractMessage(body) ?? `Binance P2P request failed with status ${res.status}`)
      }
      return p2pMethodQuoteFromAds(body, fetchedAt, options?.outlierSigma)
    },
  }
}
