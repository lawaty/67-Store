/**
 * Owns the manual P2P rate key (`rate:usdt:p2p`) and the 90-day history key
 * (`rate:usdt:p2p:history`), with helpers for last-known and bounded history.
 */
import { SettingsRepository } from "@/shared/settings-repository"

export const P2P_RATE_MANUAL_KEY = "rate:usdt:p2p"
export const P2P_RATE_LAST_KEY = "rate:usdt:p2p:last"
export const P2P_RATE_HISTORY_KEY = "rate:usdt:p2p:history"
export const P2P_WINDOW_DAYS_KEY = "rate:usdt:p2p:window_days"
export const P2P_WINDOW_HOURS_KEY = "rate:usdt:p2p:window_hours"
export const P2P_SYNC_INTERVAL_SECONDS_KEY = "rate:usdt:p2p:sync_interval_seconds"
export const P2P_OUTLIER_SIGMA_KEY = "p2p:outlier_sigma"

// Aliases following the rate: prefix convention.
export const P2P_RATE_WINDOW_DAYS_KEY = P2P_WINDOW_DAYS_KEY
export const P2P_RATE_WINDOW_HOURS_KEY = P2P_WINDOW_HOURS_KEY
export const P2P_RATE_SYNC_INTERVAL_SECONDS_KEY = P2P_SYNC_INTERVAL_SECONDS_KEY

import {
  DEFAULT_P2P_OUTLIER_SIGMA,
  MAX_P2P_OUTLIER_SIGMA,
  MAX_P2P_SYNC_INTERVAL_SECONDS,
  MAX_P2P_WINDOW_HOURS,
  MIN_P2P_OUTLIER_SIGMA,
  MIN_P2P_SYNC_INTERVAL_SECONDS,
  MIN_P2P_WINDOW_HOURS,
} from "@/shared/p2p-settings"

export const DEFAULT_P2P_WINDOW_DAYS = 1
export const DEFAULT_P2P_WINDOW_HOURS = 24
export const DEFAULT_P2P_SYNC_INTERVAL_SECONDS = 300
export const MIN_P2P_WINDOW_DAYS = 1
export const MAX_P2P_WINDOW_DAYS = 30
export {
  DEFAULT_P2P_OUTLIER_SIGMA,
  MAX_P2P_OUTLIER_SIGMA,
  MAX_P2P_SYNC_INTERVAL_SECONDS,
  MAX_P2P_WINDOW_HOURS,
  MIN_P2P_OUTLIER_SIGMA,
  MIN_P2P_SYNC_INTERVAL_SECONDS,
  MIN_P2P_WINDOW_HOURS,
}
export const RECOMMENDED_P2P_SYNC_INTERVAL_SECONDS = 300

export type P2pHistoryPoint = {
  readonly day: string
  readonly hour?: string
  readonly egpPerUsdtMinor: number
  readonly minEgpPerUsdtMinor?: number
  readonly avgEgpPerUsdtMinor?: number
  readonly maxEgpPerUsdtMinor?: number
  readonly offerCount?: number
  readonly priceSumMinor?: number
  readonly stdDevEgpPerUsdtMinor?: number
  readonly outlierCount?: number
  readonly lastObservedAt?: string
}

export function p2pHourKey(atIso: string): string | null {
  if (typeof atIso !== "string") return null
  const t = Date.parse(atIso)
  if (Number.isNaN(t)) return null
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00:00.000Z`
}

function isValidHourString(hour: unknown): hour is string {
  if (typeof hour !== "string") return false
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00.000Z$/.test(hour)) return false
  const t = Date.parse(hour)
  if (Number.isNaN(t)) return false
  // Hour must be 00-23 and match parsed components
  const d = new Date(t)
  if (d.getUTCHours() < 0 || d.getUTCHours() > 23) return false
  if (d.getUTCMinutes() !== 0 || d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0) return false
  // Re-derive to ensure the string is the canonical bucket for its instant
  return p2pHourKey(hour) === hour
}

function isPositiveSafeIntegerString(raw: string): boolean {
  if (!/^-?\d+$/.test(raw)) {
    return false
  }
  const n = BigInt(raw)
  if (n <= BigInt(0)) {
    return false
  }
  const num = Number(raw)
  if (!Number.isSafeInteger(num)) {
    return false
  }
  return true
}

export async function readP2pManualOverride(settings: SettingsRepository): Promise<number | null> {
  const raw = await settings.get(P2P_RATE_MANUAL_KEY)
  if (raw === null) {
    return null
  }
  if (typeof raw !== "string") {
    return null
  }
  const trimmed = raw.trim()
  if (!isPositiveSafeIntegerString(trimmed)) {
    return null
  }
  return Number(trimmed)
}

export async function readP2pLastKnown(
  settings: SettingsRepository,
): Promise<{ readonly minor: number; readonly at: string } | null> {
  const raw = await settings.get(P2P_RATE_LAST_KEY)
  if (raw === null) {
    return null
  }
  if (typeof raw !== "string") {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null
  }
  const obj = parsed as Record<string, unknown>
  if (!("minor" in obj) || !("at" in obj)) {
    return null
  }
  const minor = obj.minor
  const at = obj.at
  if (typeof minor !== "number" || !Number.isInteger(minor)) {
    return null
  }
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    return null
  }
  if (typeof at !== "string") {
    return null
  }
  // basic ISO validation - try to parse
  const t = Date.parse(at)
  if (Number.isNaN(t)) {
    return null
  }
  return { minor, at }
}

export async function writeP2pLastKnown(settings: SettingsRepository, minor: number, at: string): Promise<void> {
  await settings.set(P2P_RATE_LAST_KEY, JSON.stringify({ minor, at }))
}

function isValidDayString(day: string): boolean {
  if (typeof day !== "string") {
    return false
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return false
  }
  const t = Date.parse(`${day}T00:00:00.000Z`)
  if (Number.isNaN(t)) {
    return false
  }
  return true
}

function isPositiveSafeInteger(n: unknown): n is number {
  if (typeof n !== "number") {
    return false
  }
  if (!Number.isInteger(n)) {
    return false
  }
  if (!Number.isSafeInteger(n)) {
    return false
  }
  if (n <= 0) {
    return false
  }
  return true
}

function isNonNegativeSafeInteger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && Number.isSafeInteger(n) && n >= 0
}

export async function readP2pHistory(settings: SettingsRepository): Promise<readonly P2pHistoryPoint[]> {
  const raw = await settings.get(P2P_RATE_HISTORY_KEY)
  if (raw === null) {
    return []
  }
  if (typeof raw !== "string") {
    return []
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) {
    return []
  }
  const result: P2pHistoryPoint[] = []
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue
    }
    const obj = item as Record<string, unknown>
    if (!("day" in obj) || !("egpPerUsdtMinor" in obj)) {
      continue
    }
    const day = obj.day
    const egpPerUsdtMinor = obj.egpPerUsdtMinor
    if (!isValidDayString(day as string)) {
      continue
    }
    if (!isPositiveSafeInteger(egpPerUsdtMinor)) {
      continue
    }
    const point: {
      day: string
      hour?: string
      egpPerUsdtMinor: number
      minEgpPerUsdtMinor?: number
      avgEgpPerUsdtMinor?: number
      maxEgpPerUsdtMinor?: number
      offerCount?: number
      priceSumMinor?: number
      stdDevEgpPerUsdtMinor?: number
      outlierCount?: number
      lastObservedAt?: string
    } = { day: day as string, egpPerUsdtMinor: egpPerUsdtMinor as number }
    if ("hour" in obj && obj.hour !== undefined && obj.hour !== null) {
      if (isValidHourString(obj.hour)) {
        point.hour = obj.hour
      }
    }
    if (isPositiveSafeInteger(obj.minEgpPerUsdtMinor)) {
      point.minEgpPerUsdtMinor = obj.minEgpPerUsdtMinor
    }
    if (isPositiveSafeInteger(obj.avgEgpPerUsdtMinor)) {
      point.avgEgpPerUsdtMinor = obj.avgEgpPerUsdtMinor
    }
    if (isPositiveSafeInteger(obj.maxEgpPerUsdtMinor)) {
      point.maxEgpPerUsdtMinor = obj.maxEgpPerUsdtMinor
    }
    if (isPositiveSafeInteger(obj.offerCount)) {
      point.offerCount = obj.offerCount
    }
    if (isPositiveSafeInteger(obj.priceSumMinor)) {
      point.priceSumMinor = obj.priceSumMinor
    }
    if (isNonNegativeSafeInteger(obj.stdDevEgpPerUsdtMinor)) {
      point.stdDevEgpPerUsdtMinor = obj.stdDevEgpPerUsdtMinor
    }
    if (isNonNegativeSafeInteger(obj.outlierCount)) {
      point.outlierCount = obj.outlierCount
    }
    if (typeof obj.lastObservedAt === "string" && !Number.isNaN(Date.parse(obj.lastObservedAt))) {
      point.lastObservedAt = obj.lastObservedAt
    }
    result.push(point)
  }
  return result
}

function getUtcDayMs(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`)
}

function pointTimestampMs(p: P2pHistoryPoint): number {
  if (typeof p.lastObservedAt === "string" && !Number.isNaN(Date.parse(p.lastObservedAt))) {
    return Date.parse(p.lastObservedAt)
  }
  if (isValidHourString(p.hour)) {
    return Date.parse(p.hour)
  }
  return Date.parse(`${p.day}T23:59:59.999Z`)
}

export async function appendP2pHistory(
  settings: SettingsRepository,
  point: P2pHistoryPoint,
  nowIso: string,
): Promise<void> {
  if (!isValidDayString(point.day)) {
    return
  }
  if (!isPositiveSafeInteger(point.egpPerUsdtMinor)) {
    return
  }
  if (typeof nowIso !== "string") {
    return
  }
  const nowMs = Date.parse(nowIso)
  if (Number.isNaN(nowMs)) {
    return
  }

  // Validate optional incoming fields.
  const incomingMin = isPositiveSafeInteger(point.minEgpPerUsdtMinor) ? point.minEgpPerUsdtMinor : undefined
  const incomingAvg = isPositiveSafeInteger(point.avgEgpPerUsdtMinor) ? point.avgEgpPerUsdtMinor : undefined
  const incomingMax = isPositiveSafeInteger(point.maxEgpPerUsdtMinor) ? point.maxEgpPerUsdtMinor : undefined
  const incomingCount = isPositiveSafeInteger(point.offerCount) ? point.offerCount : undefined
  const incomingSum = isPositiveSafeInteger(point.priceSumMinor) ? point.priceSumMinor : undefined
  const incomingStdDev = isNonNegativeSafeInteger(point.stdDevEgpPerUsdtMinor) ? point.stdDevEgpPerUsdtMinor : undefined
  const incomingOutlierCount = isNonNegativeSafeInteger(point.outlierCount) ? point.outlierCount : undefined
  const incomingLastObservedAt =
    typeof point.lastObservedAt === "string" && !Number.isNaN(Date.parse(point.lastObservedAt))
      ? point.lastObservedAt
      : undefined

  const hasIncomingRange =
    incomingMin !== undefined ||
    incomingMax !== undefined ||
    incomingAvg !== undefined ||
    incomingCount !== undefined ||
    incomingSum !== undefined ||
    incomingStdDev !== undefined ||
    incomingOutlierCount !== undefined

  const incomingHour = isValidHourString(point.hour) ? point.hour : undefined
  const bucketKey = incomingHour ?? point.day

  const existing = await readP2pHistory(settings)

  const map = new Map<string, P2pHistoryPoint>()
  for (const p of existing) {
    const key = isValidHourString(p.hour) ? p.hour : p.day
    map.set(key, p)
  }

  const storedExisting = map.get(bucketKey)
  // skip if incoming lastObservedAt is not newer than stored, but allow a
  // ranged observation to upgrade a stored bare point at the same timestamp
  if (
    storedExisting !== undefined &&
    incomingLastObservedAt !== undefined &&
    typeof storedExisting.lastObservedAt === "string"
  ) {
    const incomingMs = Date.parse(incomingLastObservedAt)
    const storedMs = Date.parse(storedExisting.lastObservedAt)
    if (incomingMs < storedMs) {
      return
    }
    if (incomingMs === storedMs) {
      const storedHadRange =
        storedExisting.minEgpPerUsdtMinor !== undefined ||
        storedExisting.maxEgpPerUsdtMinor !== undefined ||
        storedExisting.avgEgpPerUsdtMinor !== undefined ||
        storedExisting.offerCount !== undefined ||
        storedExisting.priceSumMinor !== undefined ||
        storedExisting.stdDevEgpPerUsdtMinor !== undefined ||
        storedExisting.outlierCount !== undefined
      const allowUpgrade = !storedHadRange && hasIncomingRange
      if (!allowUpgrade) {
        return
      }
    }
  }

  const existingCount = storedExisting?.offerCount ?? 1
  const existingSum =
    storedExisting?.priceSumMinor ??
    (storedExisting?.avgEgpPerUsdtMinor ?? storedExisting?.egpPerUsdtMinor ?? point.egpPerUsdtMinor) *
      existingCount

  let mergedMin: number | undefined
  let mergedMax: number | undefined
  let mergedCount: number | undefined
  let mergedSum: number | undefined
  let mergedAvg: number | undefined
  let mergedOfferCount: number | undefined
  let mergedPriceSum: number | undefined
  let mergedStdDev: number | undefined
  let mergedOutlierCount: number | undefined

  if (hasIncomingRange) {
    const eMin = storedExisting?.minEgpPerUsdtMinor
    const iMin = incomingMin
    if (eMin !== undefined && iMin !== undefined) {
      mergedMin = Math.min(eMin, iMin)
    } else if (iMin !== undefined) {
      mergedMin = iMin
    } else {
      mergedMin = eMin
    }

    const eMax = storedExisting?.maxEgpPerUsdtMinor
    const iMax = incomingMax
    if (eMax !== undefined && iMax !== undefined) {
      mergedMax = Math.max(eMax, iMax)
    } else if (iMax !== undefined) {
      mergedMax = iMax
    } else {
      mergedMax = eMax
    }

    const iCount = incomingCount ?? 1
    const eCount = storedExisting !== undefined ? existingCount : 0
    // If existing had no range, treat as one observation for count/sum purposes.
    const existingHadRange =
      storedExisting?.minEgpPerUsdtMinor !== undefined ||
      storedExisting?.maxEgpPerUsdtMinor !== undefined ||
      storedExisting?.avgEgpPerUsdtMinor !== undefined ||
      storedExisting?.offerCount !== undefined ||
      storedExisting?.priceSumMinor !== undefined ||
      storedExisting?.stdDevEgpPerUsdtMinor !== undefined ||
      storedExisting?.outlierCount !== undefined
    const effectiveExistingCount = storedExisting !== undefined ? (existingHadRange ? existingCount : 1) : 0
    const effectiveExistingSum = storedExisting !== undefined
      ? (existingHadRange
          ? existingSum
          : (storedExisting.avgEgpPerUsdtMinor ?? storedExisting.egpPerUsdtMinor ?? point.egpPerUsdtMinor) * 1)
      : 0
    const iSum = incomingSum ?? (incomingAvg ?? point.egpPerUsdtMinor) * iCount
    const existingAvg = effectiveExistingCount > 0 ? effectiveExistingSum / effectiveExistingCount : 0
    const incomingAvgForMerge = iSum / iCount

    mergedCount = effectiveExistingCount + iCount
    mergedSum = effectiveExistingSum + iSum
    if (mergedCount > 0) {
      mergedAvg = Math.floor(mergedSum / mergedCount + 0.5)
    }
    mergedOfferCount = mergedCount
    mergedPriceSum = mergedSum

    const eOutliers = isNonNegativeSafeInteger(storedExisting?.outlierCount) ? storedExisting.outlierCount : 0
    const iOutliers = incomingOutlierCount ?? 0
    if (storedExisting?.outlierCount !== undefined || incomingOutlierCount !== undefined) {
      mergedOutlierCount = eOutliers + iOutliers
    }

    const hasSigma = storedExisting?.stdDevEgpPerUsdtMinor !== undefined || incomingStdDev !== undefined
    if (hasSigma && mergedCount > 0 && mergedAvg !== undefined) {
      const eSigma = isNonNegativeSafeInteger(storedExisting?.stdDevEgpPerUsdtMinor) ? storedExisting.stdDevEgpPerUsdtMinor : 0
      const iSigma = incomingStdDev ?? 0
      const variance =
        (effectiveExistingCount * (eSigma * eSigma + (existingAvg - mergedAvg) * (existingAvg - mergedAvg)) +
          iCount * (iSigma * iSigma + (incomingAvgForMerge - mergedAvg) * (incomingAvgForMerge - mergedAvg))) /
        mergedCount
      mergedStdDev = Math.floor(Math.sqrt(variance) + 0.5)
    }
  } else {
    // preserve existing range
    mergedMin = storedExisting?.minEgpPerUsdtMinor
    mergedMax = storedExisting?.maxEgpPerUsdtMinor
    mergedAvg = storedExisting?.avgEgpPerUsdtMinor
    mergedOfferCount = storedExisting?.offerCount
    mergedPriceSum = storedExisting?.priceSumMinor
    mergedStdDev = storedExisting?.stdDevEgpPerUsdtMinor
    mergedOutlierCount = storedExisting?.outlierCount
  }

  const stored: {
    day: string
    hour?: string
    egpPerUsdtMinor: number
    minEgpPerUsdtMinor?: number
    avgEgpPerUsdtMinor?: number
    maxEgpPerUsdtMinor?: number
    offerCount?: number
    priceSumMinor?: number
    stdDevEgpPerUsdtMinor?: number
    outlierCount?: number
    lastObservedAt?: string
  } = { day: point.day, egpPerUsdtMinor: point.egpPerUsdtMinor }

  const storedHour = incomingHour ?? (storedExisting !== undefined && isValidHourString(storedExisting.hour) ? storedExisting.hour : undefined)
  if (storedHour !== undefined) stored.hour = storedHour

  if (mergedMin !== undefined) stored.minEgpPerUsdtMinor = mergedMin
  if (mergedAvg !== undefined) stored.avgEgpPerUsdtMinor = mergedAvg
  if (mergedMax !== undefined) stored.maxEgpPerUsdtMinor = mergedMax
  if (mergedOfferCount !== undefined) stored.offerCount = mergedOfferCount
  if (mergedPriceSum !== undefined) stored.priceSumMinor = mergedPriceSum
  if (mergedStdDev !== undefined) stored.stdDevEgpPerUsdtMinor = mergedStdDev
  if (mergedOutlierCount !== undefined) stored.outlierCount = mergedOutlierCount
  if (incomingLastObservedAt !== undefined) {
    stored.lastObservedAt = incomingLastObservedAt
  } else if (storedExisting?.lastObservedAt !== undefined) {
    stored.lastObservedAt = storedExisting.lastObservedAt
  }

  map.set(bucketKey, stored)

  const all = Array.from(map.values()).sort((a, b) => pointTimestampMs(a) - pointTimestampMs(b))

  const cutoffMs = nowMs - 90 * 24 * 60 * 60 * 1000
  const filtered = all.filter((p) => {
    // Prune by timestamp; fall back to day cutoff for points whose timestamp
    // resolution would otherwise keep a day point just inside the window.
    // Legacy day points use end-of-day timestamp via pointTimestampMs.
    return pointTimestampMs(p) >= cutoffMs
  })

  await settings.set(P2P_RATE_HISTORY_KEY, JSON.stringify(filtered))
}

// Settings helpers
export async function readP2pWindowDays(settings: SettingsRepository): Promise<number> {
  const raw = await settings.get(P2P_WINDOW_DAYS_KEY)
  if (raw === null) return DEFAULT_P2P_WINDOW_DAYS
  const n = Number(raw)
  if (!Number.isSafeInteger(n) || n < MIN_P2P_WINDOW_DAYS || n > MAX_P2P_WINDOW_DAYS) {
    return DEFAULT_P2P_WINDOW_DAYS
  }
  return n
}

export async function readP2pWindowHours(settings: SettingsRepository): Promise<number> {
  const raw = await settings.get(P2P_WINDOW_HOURS_KEY)
  if (raw !== null) {
    const n = Number(raw)
    if (Number.isSafeInteger(n) && n >= MIN_P2P_WINDOW_HOURS && n <= MAX_P2P_WINDOW_HOURS) {
      return n
    }
  }
  // Legacy fallback: window_days 1..30 -> hours
  const legacyRaw = await settings.get(P2P_WINDOW_DAYS_KEY)
  if (legacyRaw !== null) {
    const n = Number(legacyRaw)
    if (Number.isSafeInteger(n) && n >= MIN_P2P_WINDOW_DAYS && n <= MAX_P2P_WINDOW_DAYS) {
      return n * 24
    }
  }
  return DEFAULT_P2P_WINDOW_HOURS
}

export async function readP2pSyncIntervalSeconds(settings: SettingsRepository): Promise<number> {
  const raw = await settings.get(P2P_SYNC_INTERVAL_SECONDS_KEY)
  if (raw === null) return DEFAULT_P2P_SYNC_INTERVAL_SECONDS
  const n = Number(raw)
  if (!Number.isSafeInteger(n) || n < MIN_P2P_SYNC_INTERVAL_SECONDS || n > MAX_P2P_SYNC_INTERVAL_SECONDS) {
    return DEFAULT_P2P_SYNC_INTERVAL_SECONDS
  }
  return n
}

export async function writeP2pWindowDays(settings: SettingsRepository, days: number): Promise<void> {
  if (!Number.isSafeInteger(days) || days < MIN_P2P_WINDOW_DAYS || days > MAX_P2P_WINDOW_DAYS) {
    throw new RangeError("windowDays must be an integer between 1 and 30")
  }
  await settings.set(P2P_WINDOW_DAYS_KEY, String(days))
}

export async function writeP2pWindowHours(settings: SettingsRepository, hours: number): Promise<void> {
  if (!Number.isSafeInteger(hours) || hours < MIN_P2P_WINDOW_HOURS || hours > MAX_P2P_WINDOW_HOURS) {
    throw new RangeError("windowHours must be an integer between 1 and 720")
  }
  await settings.set(P2P_WINDOW_HOURS_KEY, String(hours))
  await settings.delete(P2P_WINDOW_DAYS_KEY)
}

export async function writeP2pSyncIntervalSeconds(settings: SettingsRepository, seconds: number): Promise<void> {
  if (!Number.isSafeInteger(seconds) || seconds < MIN_P2P_SYNC_INTERVAL_SECONDS || seconds > MAX_P2P_SYNC_INTERVAL_SECONDS) {
    throw new RangeError(
      `syncIntervalSeconds must be an integer between ${MIN_P2P_SYNC_INTERVAL_SECONDS} and ${MAX_P2P_SYNC_INTERVAL_SECONDS}`,
    )
  }
  await settings.set(P2P_SYNC_INTERVAL_SECONDS_KEY, String(seconds))
}

export async function readP2pOutlierSigma(settings: SettingsRepository): Promise<number> {
  const raw = await settings.get(P2P_OUTLIER_SIGMA_KEY)
  if (raw === null) return DEFAULT_P2P_OUTLIER_SIGMA
  const n = Number(raw)
  if (!Number.isSafeInteger(n) || n < MIN_P2P_OUTLIER_SIGMA || n > MAX_P2P_OUTLIER_SIGMA) {
    return DEFAULT_P2P_OUTLIER_SIGMA
  }
  return n
}

export async function writeP2pOutlierSigma(settings: SettingsRepository, sigma: number): Promise<void> {
  if (!Number.isSafeInteger(sigma) || sigma < MIN_P2P_OUTLIER_SIGMA || sigma > MAX_P2P_OUTLIER_SIGMA) {
    throw new RangeError("outlierSigma must be an integer between 1 and 5")
  }
  await settings.set(P2P_OUTLIER_SIGMA_KEY, String(sigma))
}

export type P2pSettings = {
  readonly windowHours: number
  readonly minWindowHours: number
  readonly maxWindowHours: number
  readonly syncIntervalSeconds: number
  readonly minSyncIntervalSeconds: number
  readonly maxSyncIntervalSeconds: number
  readonly recommendedSyncIntervalSeconds: number
  readonly outlierSigma: number
  readonly minOutlierSigma: number
  readonly maxOutlierSigma: number
}

export async function readP2pSettings(settings: SettingsRepository): Promise<P2pSettings> {
  const [windowHours, syncIntervalSeconds, outlierSigma] = await Promise.all([
    readP2pWindowHours(settings),
    readP2pSyncIntervalSeconds(settings),
    readP2pOutlierSigma(settings),
  ])
  return {
    windowHours,
    minWindowHours: MIN_P2P_WINDOW_HOURS,
    maxWindowHours: MAX_P2P_WINDOW_HOURS,
    syncIntervalSeconds,
    minSyncIntervalSeconds: MIN_P2P_SYNC_INTERVAL_SECONDS,
    maxSyncIntervalSeconds: MAX_P2P_SYNC_INTERVAL_SECONDS,
    recommendedSyncIntervalSeconds: RECOMMENDED_P2P_SYNC_INTERVAL_SECONDS,
    outlierSigma,
    minOutlierSigma: MIN_P2P_OUTLIER_SIGMA,
    maxOutlierSigma: MAX_P2P_OUTLIER_SIGMA,
  }
}

export async function writeP2pSettings(
  settings: SettingsRepository,
  input: { windowHours: number; syncIntervalSeconds: number; outlierSigma: number },
): Promise<void> {
  if (!Number.isSafeInteger(input.windowHours) || input.windowHours < MIN_P2P_WINDOW_HOURS || input.windowHours > MAX_P2P_WINDOW_HOURS) {
    throw new RangeError("windowHours must be an integer between 1 and 720")
  }
  if (
    !Number.isSafeInteger(input.syncIntervalSeconds) ||
    input.syncIntervalSeconds < MIN_P2P_SYNC_INTERVAL_SECONDS ||
    input.syncIntervalSeconds > MAX_P2P_SYNC_INTERVAL_SECONDS
  ) {
    throw new RangeError(
      `syncIntervalSeconds must be an integer between ${MIN_P2P_SYNC_INTERVAL_SECONDS} and ${MAX_P2P_SYNC_INTERVAL_SECONDS}`,
    )
  }
  if (!Number.isSafeInteger(input.outlierSigma) || input.outlierSigma < MIN_P2P_OUTLIER_SIGMA || input.outlierSigma > MAX_P2P_OUTLIER_SIGMA) {
    throw new RangeError("outlierSigma must be an integer between 1 and 5")
  }
  await writeP2pWindowHours(settings, input.windowHours)
  await writeP2pSyncIntervalSeconds(settings, input.syncIntervalSeconds)
  await writeP2pOutlierSigma(settings, input.outlierSigma)
}

// Aliases
export const saveP2pSettings = writeP2pSettings
export const readP2pWindowRange = async (
  settings: SettingsRepository,
  windowHours: number,
  nowIso: string = new Date().toISOString(),
): Promise<import("@/treasury/ports/p2p-quote").P2pPriceRange | null> => {
  const n =
    Number.isSafeInteger(windowHours) && windowHours >= MIN_P2P_WINDOW_HOURS && windowHours <= MAX_P2P_WINDOW_HOURS
      ? windowHours
      : DEFAULT_P2P_WINDOW_HOURS
  const nowMsParsed = Date.parse(nowIso)
  const nowMs = Number.isNaN(nowMsParsed) ? Date.now() : nowMsParsed
  const lowerMs = nowMs - n * 3600000
  const upperMs = nowMs + 60_000
  const history = await readP2pHistory(settings)
  const slice = history.filter((p) => {
    const ts = pointTimestampMs(p)
    return ts >= lowerMs && ts <= upperMs
  })

  let min: number | undefined
  let max: number | undefined
  let count = 0
  let sum = 0
  let outlierCount = 0
  let hasSigma = false
  const components: Array<{ n: number; avg: number; sigma: number }> = []
  for (const p of slice) {
    if (isPositiveSafeInteger(p.minEgpPerUsdtMinor)) {
      min = min === undefined ? p.minEgpPerUsdtMinor : Math.min(min, p.minEgpPerUsdtMinor)
    }
    if (isPositiveSafeInteger(p.maxEgpPerUsdtMinor)) {
      max = max === undefined ? p.maxEgpPerUsdtMinor : Math.max(max, p.maxEgpPerUsdtMinor)
    }
    const c = isPositiveSafeInteger(p.offerCount) ? p.offerCount : 1
    const pointAvg = isPositiveSafeInteger(p.avgEgpPerUsdtMinor) ? p.avgEgpPerUsdtMinor : p.egpPerUsdtMinor
    const s = isPositiveSafeInteger(p.priceSumMinor) ? p.priceSumMinor : pointAvg * c
    count += c
    sum += s
    outlierCount += isNonNegativeSafeInteger(p.outlierCount) ? p.outlierCount : 0
    if (isNonNegativeSafeInteger(p.stdDevEgpPerUsdtMinor)) hasSigma = true
    components.push({
      n: c,
      avg: pointAvg,
      sigma: isNonNegativeSafeInteger(p.stdDevEgpPerUsdtMinor) ? p.stdDevEgpPerUsdtMinor : 0,
    })
  }

  if (min === undefined || max === undefined || count <= 0) {
    return null
  }
  const avg = Math.floor(sum / count + 0.5)
  const overallMean = sum / count
  let stdDevEgpPerUsdtMinor: number | undefined
  if (hasSigma) {
    let varianceNum = 0
    for (const c of components) {
      varianceNum += c.n * (c.sigma * c.sigma + (c.avg - overallMean) * (c.avg - overallMean))
    }
    stdDevEgpPerUsdtMinor = Math.floor(Math.sqrt(varianceNum / count) + 0.5)
  }
  return {
    minEgpPerUsdtMinor: min,
    avgEgpPerUsdtMinor: avg,
    maxEgpPerUsdtMinor: max,
    adCount: count,
    priceSumMinor: sum,
    outlierCount,
    ...(stdDevEgpPerUsdtMinor !== undefined ? { stdDevEgpPerUsdtMinor } : {}),
  }
}
