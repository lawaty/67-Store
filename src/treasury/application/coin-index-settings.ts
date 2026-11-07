/**
 * Persists and reads coin index settings (`coin:index_*`) with safe defaults and
 * validation for malformed stored values.
 */
import { SettingsRepository } from "@/shared/settings-repository"
import {
  DEFAULT_COIN_INDEX,
  DEFAULT_COIN_INDEX_CAP_BPS,
  coinValueMinor,
} from "@/treasury/domain/coin-index"

export const COIN_INDEX_MICRO_KEY = "coin:index_micro"
export const COIN_INDEX_CAP_BPS_KEY = "coin:index_cap_bps"
export const COIN_INDEX_UPDATED_AT_KEY = "coin:index_updated_at"
export const COIN_INDEX_LAST_RUN_KEY = "coin:index_last_run"

export type CoinIndexRun = {
  fromIndexMicro: number
  toIndexMicro: number
  meanRatioBps: number
  capped: boolean
  products: number
  at: string
}

export type CoinIndexState = {
  indexMicro: number
  coinValueMinor: number
  capBps: number
  updatedAt: string | null
  lastRun: CoinIndexRun | null
}

function parsePositiveSafeInt(raw: string | null): number | null {
  if (raw === null) {
    return null
  }
  const n = Number(raw)
  if (!Number.isSafeInteger(n) || n <= 0) {
    return null
  }
  return n
}

function parseCapBps(raw: string | null): number | null {
  if (raw === null) {
    return null
  }
  const n = Number(raw)
  if (!Number.isSafeInteger(n) || n < 0 || n > 10_000) {
    return null
  }
  return n
}

function parseIsoDate(raw: string | null): string | null {
  if (raw === null) {
    return null
  }
  const t = Date.parse(raw)
  if (!Number.isFinite(t)) {
    return null
  }
  return raw
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseCoinIndexRun(raw: string | null): CoinIndexRun | null {
  if (raw === null) {
    return null
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isObject(parsed)) {
    return null
  }
  const fromIndexMicro = parsed.fromIndexMicro
  const toIndexMicro = parsed.toIndexMicro
  const meanRatioBps = parsed.meanRatioBps
  const capped = parsed.capped
  const products = parsed.products
  const at = parsed.at
  if (!Number.isSafeInteger(fromIndexMicro) || (fromIndexMicro as number) <= 0) {
    return null
  }
  if (!Number.isSafeInteger(toIndexMicro) || (toIndexMicro as number) <= 0) {
    return null
  }
  if (!Number.isSafeInteger(meanRatioBps)) {
    return null
  }
  if (typeof capped !== "boolean") {
    return null
  }
  if (!Number.isSafeInteger(products) || (products as number) < 0) {
    return null
  }
  if (parseIsoDate(typeof at === "string" ? at : null) === null) {
    return null
  }
  return {
    fromIndexMicro: fromIndexMicro as number,
    toIndexMicro: toIndexMicro as number,
    meanRatioBps: meanRatioBps as number,
    capped,
    products: products as number,
    at: at as string,
  }
}

function assertValidRun(run: CoinIndexRun): void {
  if (!Number.isSafeInteger(run.fromIndexMicro) || run.fromIndexMicro <= 0) {
    throw new RangeError("fromIndexMicro must be a safe positive integer")
  }
  if (!Number.isSafeInteger(run.toIndexMicro) || run.toIndexMicro <= 0) {
    throw new RangeError("toIndexMicro must be a safe positive integer")
  }
  if (!Number.isSafeInteger(run.meanRatioBps)) {
    throw new RangeError("meanRatioBps must be a safe integer")
  }
  if (typeof run.capped !== "boolean") {
    throw new RangeError("capped must be a boolean")
  }
  if (!Number.isSafeInteger(run.products) || run.products < 0) {
    throw new RangeError("products must be a safe non-negative integer")
  }
  if (parseIsoDate(run.at) === null) {
    throw new RangeError("at must be a valid ISO date string")
  }
}

export async function readCoinIndex(settings: SettingsRepository): Promise<CoinIndexState> {
  const [indexRaw, capRaw, updatedAtRaw, lastRunRaw] = await Promise.all([
    settings.get(COIN_INDEX_MICRO_KEY),
    settings.get(COIN_INDEX_CAP_BPS_KEY),
    settings.get(COIN_INDEX_UPDATED_AT_KEY),
    settings.get(COIN_INDEX_LAST_RUN_KEY),
  ])

  const indexMicro = parsePositiveSafeInt(indexRaw) ?? DEFAULT_COIN_INDEX
  const capBps = parseCapBps(capRaw) ?? DEFAULT_COIN_INDEX_CAP_BPS

  return {
    indexMicro,
    coinValueMinor: coinValueMinor(indexMicro),
    capBps,
    updatedAt: parseIsoDate(updatedAtRaw),
    lastRun: parseCoinIndexRun(lastRunRaw),
  }
}

export function coinIndexLastMoveBps(state: CoinIndexState): number | null {
  if (state.lastRun === null || state.lastRun.fromIndexMicro === 0) {
    return null
  }
  return Math.round(
    ((state.lastRun.toIndexMicro - state.lastRun.fromIndexMicro) * 10000) / state.lastRun.fromIndexMicro,
  )
}

export function coinIndexCapped(state: CoinIndexState): boolean {
  return state.lastRun?.capped ?? false
}

export async function readCoinValueMinor(settings: SettingsRepository): Promise<number> {
  const state = await readCoinIndex(settings)
  return state.coinValueMinor
}

export async function writeCoinIndexRun(
  settings: SettingsRepository,
  input: { indexMicro: number; capBps: number; updatedAt: string; lastRun: CoinIndexRun },
): Promise<void> {
  if (!Number.isSafeInteger(input.indexMicro) || input.indexMicro <= 0) {
    throw new RangeError("indexMicro must be a safe positive integer")
  }
  if (!Number.isSafeInteger(input.capBps) || input.capBps < 0 || input.capBps > 10_000) {
    throw new RangeError("capBps must be a safe integer between 0 and 10000")
  }
  if (parseIsoDate(input.updatedAt) === null) {
    throw new RangeError("updatedAt must be a valid ISO date string")
  }
  assertValidRun(input.lastRun)
  if (input.lastRun.toIndexMicro !== input.indexMicro) {
    throw new RangeError("lastRun.toIndexMicro must match indexMicro")
  }

  await Promise.all([
    settings.set(COIN_INDEX_MICRO_KEY, String(input.indexMicro)),
    settings.set(COIN_INDEX_CAP_BPS_KEY, String(input.capBps)),
    settings.set(COIN_INDEX_UPDATED_AT_KEY, input.updatedAt),
    settings.set(COIN_INDEX_LAST_RUN_KEY, JSON.stringify(input.lastRun)),
  ])
}

export async function writeCoinIndexCap(settings: SettingsRepository, capBps: number): Promise<void> {
  if (!Number.isSafeInteger(capBps) || capBps < 0 || capBps > 10_000) {
    throw new RangeError("capBps must be a safe integer between 0 and 10000")
  }
  await settings.set(COIN_INDEX_CAP_BPS_KEY, String(capBps))
}
