/**
 * Resolves the USDT/EGP P2P rate: a fresh provider quote wins, otherwise the
 * manual setting, otherwise the last known value. Fresh quotes are appended to
 * 90-day history best-effort.
 */
import { SettingsRepository } from "@/shared/settings-repository"
import { DEFAULT_P2P_OUTLIER_SIGMA } from "@/shared/p2p-settings"
import { appendP2pHistory, p2pHourKey, readP2pLastKnown, readP2pManualOverride, readP2pOutlierSigma, writeP2pLastKnown, readP2pSyncIntervalSeconds, DEFAULT_P2P_SYNC_INTERVAL_SECONDS, MIN_P2P_SYNC_INTERVAL_SECONDS } from "@/treasury/application/p2p-rate-settings"
import { P2pQuoteProvider, P2pQuote, P2pPriceRange, P2pRate, P2pRateSource, P2pRateError } from "@/treasury/ports/p2p-quote"

export { P2pRateError }
export type { P2pQuoteProvider, P2pQuote, P2pPriceRange, P2pRate, P2pRateSource }

export type P2pLatestRate = {
  readonly egpPerUsdtMinor: number
  readonly fetchedAt: string
  readonly stale: boolean
}

export async function readP2pLatestRate(
  settings: SettingsRepository,
  nowIso: string,
): Promise<P2pLatestRate | null> {
  const lastKnown = await readP2pLastKnown(settings)
  if (lastKnown === null) return null
  const syncIntervalSeconds = await readP2pSyncIntervalSeconds(settings)
  const ageMs = Date.parse(nowIso) - Date.parse(lastKnown.at)
  const stale = !Number.isFinite(ageMs) || ageMs > syncIntervalSeconds * 1000 * 2
  return { egpPerUsdtMinor: lastKnown.minor, fetchedAt: lastKnown.at, stale }
}

export function createP2pRateReader(deps: {
  provider: P2pQuoteProvider
  settings: SettingsRepository
  now: () => string
  ttlMs?: number
}): { read(): Promise<P2pRate | null> } {
  let cache: { quote: P2pQuote; atMs: number; sigma: number } | null = null

  return {
    async read(): Promise<P2pRate | null> {
      const nowIso = deps.now()
      const nowMs = Date.parse(nowIso)

      let sigma: number
      try {
        sigma = await readP2pOutlierSigma(deps.settings)
      } catch {
        sigma = DEFAULT_P2P_OUTLIER_SIGMA
      }

      let ttlMs: number
      if (deps.ttlMs !== undefined) {
        ttlMs = deps.ttlMs
      } else {
        try {
          ttlMs = (await readP2pSyncIntervalSeconds(deps.settings)) * 1000
        } catch {
          ttlMs = DEFAULT_P2P_SYNC_INTERVAL_SECONDS * 1000
        }
      }
      if (!Number.isFinite(ttlMs) || ttlMs < MIN_P2P_SYNC_INTERVAL_SECONDS * 1000) {
        ttlMs = MIN_P2P_SYNC_INTERVAL_SECONDS * 1000
      }

      if (cache !== null) {
        if (Number.isFinite(nowMs) && nowMs - cache.atMs < ttlMs && cache.sigma === sigma) {
          return {
            egpPerUsdtMinor: cache.quote.egpPerUsdtMinor,
            fetchedAt: cache.quote.fetchedAt,
            source: "binance-p2p",
            stale: false,
            bankTransferEgpPerUsdtMinor: cache.quote.bankTransferEgpPerUsdtMinor ?? null,
            vodafoneEgpPerUsdtMinor: cache.quote.vodafoneEgpPerUsdtMinor ?? null,
            range: cache.quote.range ?? null,
          }
        }
      }

      try {
        const quote = await deps.provider.readQuote({ outlierSigma: sigma })
        const atMs = Date.parse(deps.now())
        cache = { quote, atMs: Number.isFinite(atMs) ? atMs : nowMs, sigma }
        try {
          await writeP2pLastKnown(deps.settings, quote.egpPerUsdtMinor, quote.fetchedAt)
        } catch {
          // best-effort persist must not fail the read
        }
        try {
          await appendP2pHistory(
            deps.settings,
            {
              day: quote.fetchedAt.slice(0, 10),
              hour: p2pHourKey(quote.fetchedAt) ?? undefined,
              egpPerUsdtMinor: quote.egpPerUsdtMinor,
              minEgpPerUsdtMinor: quote.range?.minEgpPerUsdtMinor,
              avgEgpPerUsdtMinor: quote.range?.avgEgpPerUsdtMinor,
              maxEgpPerUsdtMinor: quote.range?.maxEgpPerUsdtMinor,
              offerCount: quote.range?.adCount,
              priceSumMinor: quote.range?.priceSumMinor,
              stdDevEgpPerUsdtMinor: quote.range?.stdDevEgpPerUsdtMinor,
              outlierCount: quote.range?.outlierCount,
              lastObservedAt: quote.fetchedAt,
            },
            deps.now(),
          )
        } catch {
          /* ignore */
        }
        return {
          egpPerUsdtMinor: quote.egpPerUsdtMinor,
          fetchedAt: quote.fetchedAt,
          source: "binance-p2p",
          stale: false,
          bankTransferEgpPerUsdtMinor: quote.bankTransferEgpPerUsdtMinor ?? null,
          vodafoneEgpPerUsdtMinor: quote.vodafoneEgpPerUsdtMinor ?? null,
          range: quote.range ?? null,
        }
      } catch {
        if (cache !== null) {
          return {
            egpPerUsdtMinor: cache.quote.egpPerUsdtMinor,
            fetchedAt: cache.quote.fetchedAt,
            source: "binance-p2p",
            stale: true,
            bankTransferEgpPerUsdtMinor: cache.quote.bankTransferEgpPerUsdtMinor ?? null,
            vodafoneEgpPerUsdtMinor: cache.quote.vodafoneEgpPerUsdtMinor ?? null,
            range: cache.quote.range ?? null,
          }
        }
        const manual = await readP2pManualOverride(deps.settings)
        if (manual !== null) {
          return {
            egpPerUsdtMinor: manual,
            fetchedAt: null,
            source: "settings:manual",
            stale: true,
            bankTransferEgpPerUsdtMinor: null,
            vodafoneEgpPerUsdtMinor: null,
            range: null,
          }
        }
        const lastKnown = await readP2pLastKnown(deps.settings)
        if (lastKnown !== null) {
          return {
            egpPerUsdtMinor: lastKnown.minor,
            fetchedAt: lastKnown.at,
            source: "settings:last-known",
            stale: true,
            bankTransferEgpPerUsdtMinor: null,
            vodafoneEgpPerUsdtMinor: null,
            range: null,
          }
        }
        return null
      }
    },
  }
}