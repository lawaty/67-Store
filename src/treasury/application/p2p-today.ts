import { SettingsRepository } from "@/shared/settings-repository"
import { P2pFetchStats } from "@/treasury/ports/p2p-quote"
import { cairoDayKey } from "./p2p-day"
import { readP2pSyncIntervalSeconds } from "./p2p-rate-settings"

export const P2P_RATE_TODAY_KEY = "rate:usdt:p2p:today"

export type P2pTodaySnapshot = {
  day: string // Africa/Cairo YYYY-MM-DD
  minEgpPerUsdtMinor: number
  maxEgpPerUsdtMinor: number
  avgEgpPerUsdtMinor: number
  currentEgpPerUsdtMinor: number | null
  offerCount: number
  priceSumMinor: number
  sumSquaresMinor: number
  stdDevEgpPerUsdtMinor: number
  outlierCount: number
  updatedAt: string
}

export type P2pTodayFetch = {
  fetchedAt: string
  currentEgpPerUsdtMinor: number | null
  allEligibleStats: P2pFetchStats
}

function snapshotFromFetch(day: string, fetch: P2pTodayFetch): P2pTodaySnapshot {
  const s = fetch.allEligibleStats
  return {
    day,
    minEgpPerUsdtMinor: s.minEgpPerUsdtMinor,
    maxEgpPerUsdtMinor: s.maxEgpPerUsdtMinor,
    avgEgpPerUsdtMinor: s.avgEgpPerUsdtMinor,
    currentEgpPerUsdtMinor: fetch.currentEgpPerUsdtMinor,
    offerCount: s.offerCount,
    priceSumMinor: s.priceSumMinor,
    sumSquaresMinor: s.sumSquaresMinor,
    stdDevEgpPerUsdtMinor: s.stdDevEgpPerUsdtMinor,
    outlierCount: s.outlierCount,
    updatedAt: fetch.fetchedAt,
  }
}

export function mergeP2pTodaySnapshot(
  previous: P2pTodaySnapshot | null,
  fetch: P2pTodayFetch,
): P2pTodaySnapshot {
  const day = cairoDayKey(fetch.fetchedAt)
  if (previous === null || previous.day !== day) {
    return snapshotFromFetch(day, fetch)
  }

  const s = fetch.allEligibleStats
  const offerCount = previous.offerCount + s.offerCount
  const priceSumMinor = previous.priceSumMinor + s.priceSumMinor
  const sumSquaresMinor = previous.sumSquaresMinor + s.sumSquaresMinor
  const min = Math.min(previous.minEgpPerUsdtMinor, s.minEgpPerUsdtMinor)
  const max = Math.max(previous.maxEgpPerUsdtMinor, s.maxEgpPerUsdtMinor)
  const avg = Math.floor(priceSumMinor / offerCount + 0.5)
  const variance = Math.max(0, sumSquaresMinor / offerCount - (priceSumMinor / offerCount) ** 2)
  const stdDev = Math.floor(Math.sqrt(variance) + 0.5)
  const outlierCount = previous.outlierCount + s.outlierCount

  return {
    day,
    minEgpPerUsdtMinor: min,
    maxEgpPerUsdtMinor: max,
    avgEgpPerUsdtMinor: avg,
    currentEgpPerUsdtMinor: fetch.currentEgpPerUsdtMinor,
    offerCount,
    priceSumMinor,
    sumSquaresMinor,
    stdDevEgpPerUsdtMinor: stdDev,
    outlierCount,
    updatedAt: fetch.fetchedAt,
  }
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

function isValidDayString(day: unknown): day is string {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
}

export async function readP2pTodaySnapshot(
  settings: SettingsRepository,
  nowIso: string,
): Promise<{ snapshot: P2pTodaySnapshot; stale: boolean } | null> {
  const raw = await settings.get(P2P_RATE_TODAY_KEY)
  if (raw === null) return null
  if (typeof raw !== "string") return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null) return null
  const obj = parsed as Record<string, unknown>

  if (!isValidDayString(obj.day)) return null
  if (typeof obj.updatedAt !== "string" || Number.isNaN(Date.parse(obj.updatedAt))) return null
  if (
    !isFiniteNumber(obj.minEgpPerUsdtMinor) ||
    !isFiniteNumber(obj.maxEgpPerUsdtMinor) ||
    !isFiniteNumber(obj.avgEgpPerUsdtMinor) ||
    !isFiniteNumber(obj.offerCount) ||
    !isFiniteNumber(obj.priceSumMinor) ||
    !isFiniteNumber(obj.sumSquaresMinor) ||
    !isFiniteNumber(obj.stdDevEgpPerUsdtMinor) ||
    !isFiniteNumber(obj.outlierCount)
  ) {
    return null
  }
  if (!(obj.currentEgpPerUsdtMinor === null || isFiniteNumber(obj.currentEgpPerUsdtMinor))) {
    return null
  }

  const snapshot: P2pTodaySnapshot = {
    day: obj.day,
    minEgpPerUsdtMinor: obj.minEgpPerUsdtMinor,
    maxEgpPerUsdtMinor: obj.maxEgpPerUsdtMinor,
    avgEgpPerUsdtMinor: obj.avgEgpPerUsdtMinor,
    currentEgpPerUsdtMinor: obj.currentEgpPerUsdtMinor,
    offerCount: obj.offerCount,
    priceSumMinor: obj.priceSumMinor,
    sumSquaresMinor: obj.sumSquaresMinor,
    stdDevEgpPerUsdtMinor: obj.stdDevEgpPerUsdtMinor,
    outlierCount: obj.outlierCount,
    updatedAt: obj.updatedAt,
  }

  const ageMs = Date.parse(nowIso) - Date.parse(snapshot.updatedAt)
  const stale =
    snapshot.day !== cairoDayKey(nowIso) ||
    !Number.isFinite(ageMs) ||
    ageMs > (await readP2pSyncIntervalSeconds(settings)) * 1000 * 2

  return { snapshot, stale }
}

export async function writeP2pTodaySnapshot(
  settings: SettingsRepository,
  snapshot: P2pTodaySnapshot,
): Promise<void> {
  await settings.set(P2P_RATE_TODAY_KEY, JSON.stringify(snapshot))
}
