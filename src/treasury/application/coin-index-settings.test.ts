import { describe, expect, test } from "vitest"
import { SettingsRepository } from "@/shared/settings-repository"
import {
  COIN_INDEX_CAP_BPS_KEY,
  COIN_INDEX_LAST_RUN_KEY,
  COIN_INDEX_MICRO_KEY,
  COIN_INDEX_UPDATED_AT_KEY,
  coinIndexCapped,
  coinIndexLastMoveBps,
  readCoinIndex,
  readCoinValueMinor,
  writeCoinIndexCap,
  writeCoinIndexRun,
  type CoinIndexState,
} from "./coin-index-settings"

function createInMemorySettingsRepository(initial: Record<string, string> = {}): SettingsRepository {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    async get(key: string): Promise<string | null> {
      const v = store.get(key)
      if (v === undefined) return null
      return v
    },
    async set(key: string, value: string): Promise<void> {
      store.set(key, value)
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
    },
    async all(): Promise<Record<string, string>> {
      const result: Record<string, string> = {}
      for (const [k, v] of store.entries()) result[k] = v
      return result
    },
  }
}

describe("coin-index-settings", () => {
  test("readCoinIndex returns defaults when keys are absent", async () => {
    const settings = createInMemorySettingsRepository()
    expect(await readCoinIndex(settings)).toEqual({
      indexMicro: 1_000_000,
      coinValueMinor: 1,
      capBps: 500,
      updatedAt: null,
      lastRun: null,
    })
  })

  test("readCoinIndex returns stored valid values", async () => {
    const lastRun = {
      fromIndexMicro: 1_000_000,
      toIndexMicro: 1_025_000,
      meanRatioBps: 10_250,
      capped: false,
      products: 12,
      at: "2026-11-06T12:00:00.000Z",
    }
    const settings = createInMemorySettingsRepository({
      [COIN_INDEX_MICRO_KEY]: "1025000",
      [COIN_INDEX_CAP_BPS_KEY]: "300",
      [COIN_INDEX_UPDATED_AT_KEY]: "2026-11-06T12:00:00.000Z",
      [COIN_INDEX_LAST_RUN_KEY]: JSON.stringify(lastRun),
    })

    expect(await readCoinIndex(settings)).toEqual({
      indexMicro: 1_025_000,
      coinValueMinor: 1,
      capBps: 300,
      updatedAt: "2026-11-06T12:00:00.000Z",
      lastRun,
    })
  })

  test("readCoinIndex falls back for invalid stored values", async () => {
    const settings = createInMemorySettingsRepository({
      [COIN_INDEX_MICRO_KEY]: "-1",
      [COIN_INDEX_CAP_BPS_KEY]: "10001",
      [COIN_INDEX_UPDATED_AT_KEY]: "not-a-date",
      [COIN_INDEX_LAST_RUN_KEY]: "{bad",
    })

    expect(await readCoinIndex(settings)).toEqual({
      indexMicro: 1_000_000,
      coinValueMinor: 1,
      capBps: 500,
      updatedAt: null,
      lastRun: null,
    })
  })

  describe("coinIndexLastMoveBps / coinIndexCapped", () => {
    const base: CoinIndexState = {
      indexMicro: 1_000_000,
      coinValueMinor: 100,
      capBps: 500,
      updatedAt: null,
      lastRun: null,
    }

    test("returns null and false when lastRun is null", () => {
      expect(coinIndexLastMoveBps(base)).toBeNull()
      expect(coinIndexCapped(base)).toBe(false)
    })

    test("returns null when fromIndexMicro is 0", () => {
      expect(
        coinIndexLastMoveBps({
          ...base,
          lastRun: {
            fromIndexMicro: 0,
            toIndexMicro: 1_000_000,
            meanRatioBps: 0,
            capped: false,
            products: 1,
            at: "2026-11-06T12:00:00.000Z",
          },
        }),
      ).toBeNull()
    })

    test("returns positive bps for an upward move", () => {
      expect(
        coinIndexLastMoveBps({
          ...base,
          lastRun: {
            fromIndexMicro: 1_000_000,
            toIndexMicro: 1_025_000,
            meanRatioBps: 10_250,
            capped: false,
            products: 12,
            at: "2026-11-06T12:00:00.000Z",
          },
        }),
      ).toBe(250)
    })

    test("returns negative bps for a downward move", () => {
      expect(
        coinIndexLastMoveBps({
          ...base,
          lastRun: {
            fromIndexMicro: 1_000_000,
            toIndexMicro: 975_000,
            meanRatioBps: 9_750,
            capped: false,
            products: 12,
            at: "2026-11-06T12:00:00.000Z",
          },
        }),
      ).toBe(-250)
    })

    test("returns capped flag from lastRun", () => {
      const state: CoinIndexState = {
        ...base,
        lastRun: {
          fromIndexMicro: 1_000_000,
          toIndexMicro: 1_050_000,
          meanRatioBps: 10_500,
          capped: true,
          products: 3,
          at: "2026-11-06T12:00:00.000Z",
        },
      }
      expect(coinIndexCapped(state)).toBe(true)
      expect(coinIndexLastMoveBps(state)).toBe(500)
    })
  })

  test("readCoinValueMinor returns computed value", async () => {
    const settings = createInMemorySettingsRepository({
      [COIN_INDEX_MICRO_KEY]: "1050000",
    })
    expect(await readCoinValueMinor(settings)).toBe(1)
  })

  test("writeCoinIndexRun stores all keys", async () => {
    const settings = createInMemorySettingsRepository()
    const lastRun = {
      fromIndexMicro: 1_000_000,
      toIndexMicro: 1_050_000,
      meanRatioBps: 12_000,
      capped: true,
      products: 4,
      at: "2026-11-06T12:00:00.000Z",
    }

    await writeCoinIndexRun(settings, {
      indexMicro: 1_050_000,
      capBps: 500,
      updatedAt: "2026-11-06T12:00:00.000Z",
      lastRun,
    })

    expect(await settings.get(COIN_INDEX_MICRO_KEY)).toBe("1050000")
    expect(await settings.get(COIN_INDEX_CAP_BPS_KEY)).toBe("500")
    expect(await settings.get(COIN_INDEX_UPDATED_AT_KEY)).toBe("2026-11-06T12:00:00.000Z")
    expect(await settings.get(COIN_INDEX_LAST_RUN_KEY)).toBe(JSON.stringify(lastRun))
  })

  test("writeCoinIndexCap stores only cap and validates", async () => {
    const settings = createInMemorySettingsRepository({
      [COIN_INDEX_MICRO_KEY]: "1000000",
    })

    await writeCoinIndexCap(settings, 250)
    expect(await settings.get(COIN_INDEX_CAP_BPS_KEY)).toBe("250")
    expect(await settings.get(COIN_INDEX_MICRO_KEY)).toBe("1000000")

    await expect(writeCoinIndexCap(settings, -1)).rejects.toThrow(RangeError)
    await expect(writeCoinIndexCap(settings, 10_001)).rejects.toThrow(RangeError)
  })

  test("writeCoinIndexRun validates inputs", async () => {
    const settings = createInMemorySettingsRepository()
    const lastRun = {
      fromIndexMicro: 1_000_000,
      toIndexMicro: 1_050_000,
      meanRatioBps: 12_000,
      capped: true,
      products: 4,
      at: "2026-11-06T12:00:00.000Z",
    }

    await expect(
      writeCoinIndexRun(settings, {
        indexMicro: 0,
        capBps: 500,
        updatedAt: "2026-11-06T12:00:00.000Z",
        lastRun,
      }),
    ).rejects.toThrow(RangeError)

    await expect(
      writeCoinIndexRun(settings, {
        indexMicro: 1_050_000,
        capBps: 500,
        updatedAt: "bad-date",
        lastRun,
      }),
    ).rejects.toThrow(RangeError)

    await expect(
      writeCoinIndexRun(settings, {
        indexMicro: 1_000_000,
        capBps: 500,
        updatedAt: "2026-11-06T12:00:00.000Z",
        lastRun,
      }),
    ).rejects.toThrow(RangeError)
  })
})
