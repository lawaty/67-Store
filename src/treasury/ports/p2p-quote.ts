/**
 * Anti-corruption boundary for P2P USDT/EGP pricing, defining quote/provider
 * shapes with per-method (bank transfer/Vodafone Cash) fields and rate metadata.
 */
export type P2pRateSource = "binance-p2p" | "settings:manual" | "settings:last-known"

export type P2pPriceRange = {
  readonly minEgpPerUsdtMinor: number
  readonly avgEgpPerUsdtMinor: number
  readonly maxEgpPerUsdtMinor: number
  readonly adCount: number
  readonly priceSumMinor?: number
  readonly stdDevEgpPerUsdtMinor?: number
  readonly outlierCount?: number
}

export type P2pFetchStats = {
  readonly minEgpPerUsdtMinor: number
  readonly maxEgpPerUsdtMinor: number
  readonly avgEgpPerUsdtMinor: number
  readonly offerCount: number
  readonly priceSumMinor: number
  readonly sumSquaresMinor: number
  readonly stdDevEgpPerUsdtMinor: number
  readonly outlierCount: number
}

export type P2pRate = {
  readonly egpPerUsdtMinor: number
  readonly fetchedAt: string | null
  readonly source: P2pRateSource
  readonly stale: boolean
  readonly bankTransferEgpPerUsdtMinor?: number | null
  readonly vodafoneEgpPerUsdtMinor?: number | null
  readonly range?: P2pPriceRange | null
}

export type P2pQuote = {
  readonly egpPerUsdtMinor: number
  readonly fetchedAt: string
  readonly bankTransferEgpPerUsdtMinor?: number | null
  readonly vodafoneEgpPerUsdtMinor?: number | null
  readonly range?: P2pPriceRange | null
  readonly currentEgpPerUsdtMinor?: number | null
  readonly allEligibleStats?: P2pFetchStats | null
}

export type P2pQuoteOptions = { readonly outlierSigma?: number }

export interface P2pQuoteProvider {
  readQuote(options?: P2pQuoteOptions): Promise<P2pQuote>
}

export class P2pRateError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "P2pRateError"
    this.status = status
  }
}