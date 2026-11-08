import { describe, expect, it } from "vitest"
import { SettingsRepository } from "@/shared/settings-repository"
import { P2P_SYNC_INTERVAL_SECONDS_KEY } from "./p2p-rate-settings"
import {
  P2P_RATE_TODAY_KEY,
  P2pTodayFetch,
  P2pTodaySnapshot,
  mergeP2pTodaySnapshot,
  readP2pTodaySnapshot,
  writeP2pTodaySnapshot,
} from "./p2p-today"

function makeSettings(store: Record<string, string> = {}): SettingsRepository {
  return {
    get: async (key: string) => (key in store ? store[key] : null),
    set: async (key: string, value: string) => {
      store[key] = value
    },
    delete: async (key: string) => {
      delete store[key]
    },
    all: async () => ({ ...store }),
  }
}

function fetch(overrides: Partial<P2pTodayFetch> & Pick<P2pTodayFetch, "fetchedAt">): P2pTodayFetch {
  return {
    currentEgpPerUsdtMinor: 5050,
    allEligibleStats: {
      minEgpPerUsdtMinor: 5000,
      maxEgpPerUsdtMinor: 5100,
      avgEgpPerUsdtMinor: 5050,
      offerCount: 2,
      priceSumMinor: 10100,
      sumSquaresMinor: 51005000, // 5000^2 + 5100^2
      stdDevEgpPerUsdtMinor: 50,
      outlierCount: 1,
    },
    ...overrides,
  }
}

describe("p2p-today", () => {
  it("write/read round-trip", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    const snapshot: P2pTodaySnapshot = {
      day: "2024-01-01",
      minEgpPerUsdtMinor: 5000,
      maxEgpPerUsdtMinor: 5100,
      avgEgpPerUsdtMinor: 5050,
      currentEgpPerUsdtMinor: 5050,
      offerCount: 2,
      priceSumMinor: 10100,
      sumSquaresMinor: 51005000,
      stdDevEgpPerUsdtMinor: 50,
      outlierCount: 1,
      updatedAt: "2024-01-01T10:00:00.000Z",
    }
    await writeP2pTodaySnapshot(settings, snapshot)
    expect(JSON.parse(store[P2P_RATE_TODAY_KEY])).toEqual(snapshot)
    // same day, recent (sync default 300s, age 60s < 600s)
    const result = await readP2pTodaySnapshot(settings, "2024-01-01T10:01:00.000Z")
    expect(result?.snapshot).toEqual(snapshot)
    expect(result?.stale).toBe(false)
  })

  it("same Cairo day merge: min/max/avg/stdDev/offerCount/priceSum/sumSquares/outlierCount/current/updatedAt", async () => {
    const previous: P2pTodaySnapshot = {
      day: "2024-01-01",
      minEgpPerUsdtMinor: 5000,
      maxEgpPerUsdtMinor: 5100,
      avgEgpPerUsdtMinor: 5050,
      currentEgpPerUsdtMinor: 5000,
      offerCount: 2,
      priceSumMinor: 10100,
      sumSquaresMinor: 51005000, // 5000^2 + 5100^2
      stdDevEgpPerUsdtMinor: 50,
      outlierCount: 1,
      updatedAt: "2024-01-01T08:00:00.000Z",
    }
    const f = fetch({
      fetchedAt: "2024-01-01T12:00:00.000Z",
      currentEgpPerUsdtMinor: 5200,
      allEligibleStats: {
        minEgpPerUsdtMinor: 4900,
        maxEgpPerUsdtMinor: 5300,
        avgEgpPerUsdtMinor: 5100,
        offerCount: 3,
        priceSumMinor: 15300,
        sumSquaresMinor: 78150000, // 4900^2 + 5100^2 + 5300^2 = 24010000+26010000+28090000
        stdDevEgpPerUsdtMinor: 163,
        outlierCount: 2,
      },
    })
    const merged = mergeP2pTodaySnapshot(previous, f)
    expect(merged.day).toBe("2024-01-01")
    expect(merged.minEgpPerUsdtMinor).toBe(4900)
    expect(merged.maxEgpPerUsdtMinor).toBe(5300)
    expect(merged.offerCount).toBe(5)
    expect(merged.priceSumMinor).toBe(25400)
    expect(merged.sumSquaresMinor).toBe(129155000)
    // avg = floor(25400/5 + 0.5) = 5080
    expect(merged.avgEgpPerUsdtMinor).toBe(5080)
    // variance = sumSquares/n - (sum/n)^2 = 129155000/5 - (25400/5)^2 = 25831000 - 5080^2 = 25831000 - 25806400 = 24600
    // stdDev = floor(sqrt(24600)+0.5) = floor(156.843...+0.5) = 157
    expect(merged.stdDevEgpPerUsdtMinor).toBe(157)
    expect(merged.outlierCount).toBe(3)
    expect(merged.currentEgpPerUsdtMinor).toBe(5200)
    expect(merged.updatedAt).toBe("2024-01-01T12:00:00.000Z")
  })

  it("a new Cairo day resets instead of merging", async () => {
    const previous: P2pTodaySnapshot = {
      day: "2024-01-01",
      minEgpPerUsdtMinor: 5000,
      maxEgpPerUsdtMinor: 5100,
      avgEgpPerUsdtMinor: 5050,
      currentEgpPerUsdtMinor: 5050,
      offerCount: 2,
      priceSumMinor: 10100,
      sumSquaresMinor: 51005000,
      stdDevEgpPerUsdtMinor: 50,
      outlierCount: 1,
      updatedAt: "2024-01-01T23:00:00.000Z",
    }
    // 2024-01-02 01:00:00Z is 03:00 Cairo (+2) => Cairo day 2024-01-02
    const f = fetch({
      fetchedAt: "2024-01-02T01:00:00.000Z",
      currentEgpPerUsdtMinor: 5200,
      allEligibleStats: {
        minEgpPerUsdtMinor: 5200,
        maxEgpPerUsdtMinor: 5200,
        avgEgpPerUsdtMinor: 5200,
        offerCount: 1,
        priceSumMinor: 5200,
        sumSquaresMinor: 27040000,
        stdDevEgpPerUsdtMinor: 0,
        outlierCount: 0,
      },
    })
    const merged = mergeP2pTodaySnapshot(previous, f)
    expect(merged).toEqual({
      day: "2024-01-02",
      minEgpPerUsdtMinor: 5200,
      maxEgpPerUsdtMinor: 5200,
      avgEgpPerUsdtMinor: 5200,
      currentEgpPerUsdtMinor: 5200,
      offerCount: 1,
      priceSumMinor: 5200,
      sumSquaresMinor: 27040000,
      stdDevEgpPerUsdtMinor: 0,
      outlierCount: 0,
      updatedAt: "2024-01-02T01:00:00.000Z",
    })
  })

  it("stale when the stored day differs from cairoDayKey(nowIso)", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await writeP2pTodaySnapshot(settings, {
      day: "2024-01-01",
      minEgpPerUsdtMinor: 5000,
      maxEgpPerUsdtMinor: 5000,
      avgEgpPerUsdtMinor: 5000,
      currentEgpPerUsdtMinor: 5000,
      offerCount: 1,
      priceSumMinor: 5000,
      sumSquaresMinor: 25000000,
      stdDevEgpPerUsdtMinor: 0,
      outlierCount: 0,
      updatedAt: "2024-01-01T23:30:00.000Z",
    })
    // 2024-01-02 01:00Z = Cairo 03:00, day 2024-01-02; age is 90 min but day differs
    const result = await readP2pTodaySnapshot(settings, "2024-01-02T01:00:00.000Z")
    expect(result?.stale).toBe(true)
    expect(result?.snapshot.day).toBe("2024-01-01")
  })

  it("stale when ageMs > 2 × syncIntervalSeconds; not stale at exactly 2×", async () => {
    const base: P2pTodaySnapshot = {
      day: "2024-01-01",
      minEgpPerUsdtMinor: 5000,
      maxEgpPerUsdtMinor: 5000,
      avgEgpPerUsdtMinor: 5000,
      currentEgpPerUsdtMinor: 5000,
      offerCount: 1,
      priceSumMinor: 5000,
      sumSquaresMinor: 25000000,
      stdDevEgpPerUsdtMinor: 0,
      outlierCount: 0,
      updatedAt: "2024-01-01T10:00:00.000Z",
    }
    // sync interval 600s => 2x = 1200s
    const settings = makeSettings({
      [P2P_RATE_TODAY_KEY]: JSON.stringify(base),
      [P2P_SYNC_INTERVAL_SECONDS_KEY]: "600",
    })
    // exactly 2x: +1200s
    const exact = await readP2pTodaySnapshot(settings, "2024-01-01T10:20:00.000Z")
    expect(exact?.stale).toBe(false)
    // just over 2x: +1201s
    const over = await readP2pTodaySnapshot(settings, "2024-01-01T10:20:01.000Z")
    expect(over?.stale).toBe(true)
  })

  it("missing and malformed snapshots return null", async () => {
    expect(await readP2pTodaySnapshot(makeSettings({}), "2024-01-01T10:00:00.000Z")).toBeNull()
    expect(
      await readP2pTodaySnapshot(makeSettings({ [P2P_RATE_TODAY_KEY]: "not json" }), "2024-01-01T10:00:00.000Z"),
    ).toBeNull()
    expect(
      await readP2pTodaySnapshot(makeSettings({ [P2P_RATE_TODAY_KEY]: JSON.stringify(null) }), "2024-01-01T10:00:00.000Z"),
    ).toBeNull()
    // bad day format
    expect(
      await readP2pTodaySnapshot(
        makeSettings({ [P2P_RATE_TODAY_KEY]: JSON.stringify({ day: "bad", offerCount: 1, updatedAt: "2024-01-01T10:00:00.000Z" }) }),
        "2024-01-01T10:00:00.000Z",
      ),
    ).toBeNull()
    // non-finite number
    expect(
      await readP2pTodaySnapshot(
        makeSettings({
          [P2P_RATE_TODAY_KEY]: JSON.stringify({
            day: "2024-01-01",
            minEgpPerUsdtMinor: 5000,
            maxEgpPerUsdtMinor: 5000,
            avgEgpPerUsdtMinor: 5000,
            currentEgpPerUsdtMinor: 5000,
            offerCount: "2",
            priceSumMinor: 10000,
            sumSquaresMinor: 50000000,
            stdDevEgpPerUsdtMinor: 0,
            outlierCount: 0,
            updatedAt: "2024-01-01T10:00:00.000Z",
          }),
        }),
        "2024-01-01T10:00:00.000Z",
      ),
    ).toBeNull()
  })
})
