import { describe, expect, it } from "vitest"
import {
  P2P_OUTLIER_SIGMA_KEY,
  P2P_RATE_HISTORY_KEY,
  P2P_RATE_LAST_KEY,
  P2P_RATE_MANUAL_KEY,
  P2P_SYNC_INTERVAL_SECONDS_KEY,
  P2P_WINDOW_DAYS_KEY,
  P2P_WINDOW_HOURS_KEY,
  DEFAULT_P2P_SYNC_INTERVAL_SECONDS,
  DEFAULT_P2P_WINDOW_DAYS,
  DEFAULT_P2P_WINDOW_HOURS,
  appendP2pHistory,
  p2pHourKey,
  readP2pHistory,
  readP2pLastKnown,
  readP2pManualOverride,
  readP2pOutlierSigma,
  readP2pSettings,
  readP2pSyncIntervalSeconds,
  readP2pWindowDays,
  readP2pWindowHours,
  readP2pWindowRange,
  writeP2pLastKnown,
  writeP2pSettings,
  writeP2pSyncIntervalSeconds,
  writeP2pWindowDays,
  writeP2pWindowHours,
} from "./p2p-rate-settings"
import { SettingsRepository } from "@/shared/settings-repository"

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

describe("p2p-rate-settings", () => {
  it("manual: absent → null", async () => {
    const settings = makeSettings({})
    expect(await readP2pManualOverride(settings)).toBe(null)
  })

  it('manual: "4875" → 4875', async () => {
    const settings = makeSettings({ [P2P_RATE_MANUAL_KEY]: "4875" })
    expect(await readP2pManualOverride(settings)).toBe(4875)
  })

  it('manual: "abc"/"-1"/"0"/"48.75" → null', async () => {
    expect(await readP2pManualOverride(makeSettings({ [P2P_RATE_MANUAL_KEY]: "abc" }))).toBe(null)
    expect(await readP2pManualOverride(makeSettings({ [P2P_RATE_MANUAL_KEY]: "-1" }))).toBe(null)
    expect(await readP2pManualOverride(makeSettings({ [P2P_RATE_MANUAL_KEY]: "0" }))).toBe(null)
    expect(await readP2pManualOverride(makeSettings({ [P2P_RATE_MANUAL_KEY]: "48.75" }))).toBe(null)
  })

  it("last-known: absent/invalid JSON/wrong shape → null", async () => {
    expect(await readP2pLastKnown(makeSettings({}))).toBe(null)
    expect(await readP2pLastKnown(makeSettings({ [P2P_RATE_LAST_KEY]: "not json" }))).toBe(null)
    expect(await readP2pLastKnown(makeSettings({ [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875 }) }))).toBe(null)
    expect(await readP2pLastKnown(makeSettings({ [P2P_RATE_LAST_KEY]: JSON.stringify({ at: "2024-01-01T00:00:00.000Z" }) }))).toBe(null)
    expect(await readP2pLastKnown(makeSettings({ [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: "4875", at: "2024-01-01T00:00:00.000Z" }) }))).toBe(null)
  })

  it("last-known: valid → {minor, at}", async () => {
    const at = "2024-01-01T00:00:00.000Z"
    const settings = makeSettings({ [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at }) })
    expect(await readP2pLastKnown(settings)).toEqual({ minor: 4875, at })
  })

  it("writeP2pLastKnown → read-back round-trip", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await writeP2pLastKnown(settings, 4875, "2024-01-01T00:00:00.000Z")
    expect(store[P2P_RATE_LAST_KEY]).toBe(JSON.stringify({ minor: 4875, at: "2024-01-01T00:00:00.000Z" }))
    expect(await readP2pLastKnown(settings)).toEqual({ minor: 4875, at: "2024-01-01T00:00:00.000Z" })
  })

  it("history: missing/empty → []", async () => {
    expect(await readP2pHistory(makeSettings({}))).toEqual([])
    expect(await readP2pHistory(makeSettings({ [P2P_RATE_HISTORY_KEY]: "" }))).toEqual([])
  })

  it("history: valid roundtrip", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875 }, "2024-01-01T12:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([{ day: "2024-01-01", egpPerUsdtMinor: 4875 }])
  })

  it("history: malformed JSON → []", async () => {
    expect(await readP2pHistory(makeSettings({ [P2P_RATE_HISTORY_KEY]: "not json" }))).toEqual([])
  })

  it("history: malformed entries filtered", async () => {
    const settings = makeSettings({
      [P2P_RATE_HISTORY_KEY]: JSON.stringify([
        { day: "2024-01-01", egpPerUsdtMinor: 4875 },
        { day: "bad", egpPerUsdtMinor: 4875 },
        { day: "2024-01-02", egpPerUsdtMinor: -1 },
        { day: "2024-01-03", egpPerUsdtMinor: 48.75 },
        null,
        "x",
      ]),
    })
    expect(await readP2pHistory(settings)).toEqual([{ day: "2024-01-01", egpPerUsdtMinor: 4875 }])
  })

  it("history: parse keeps valid stddev (including 0) and outlierCount; drops negative/fractional/NaN", async () => {
    const settings = makeSettings({
      [P2P_RATE_HISTORY_KEY]: JSON.stringify([
        { day: "2024-01-01", egpPerUsdtMinor: 4875, stdDevEgpPerUsdtMinor: 123, outlierCount: 4 },
        { day: "2024-01-02", egpPerUsdtMinor: 4876, stdDevEgpPerUsdtMinor: 0, outlierCount: 0 },
        { day: "2024-01-03", egpPerUsdtMinor: 4877, stdDevEgpPerUsdtMinor: -1, outlierCount: -2 },
        { day: "2024-01-04", egpPerUsdtMinor: 4878, stdDevEgpPerUsdtMinor: 1.5, outlierCount: 2.5 },
        { day: "2024-01-05", egpPerUsdtMinor: 4879, stdDevEgpPerUsdtMinor: Number.NaN, outlierCount: Number.POSITIVE_INFINITY },
        { day: "2024-01-06", egpPerUsdtMinor: 4880, stdDevEgpPerUsdtMinor: "10", outlierCount: "1" },
      ]),
    })
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 4875, stdDevEgpPerUsdtMinor: 123, outlierCount: 4 },
      { day: "2024-01-02", egpPerUsdtMinor: 4876, stdDevEgpPerUsdtMinor: 0, outlierCount: 0 },
      { day: "2024-01-03", egpPerUsdtMinor: 4877 },
      { day: "2024-01-04", egpPerUsdtMinor: 4878 },
      { day: "2024-01-05", egpPerUsdtMinor: 4879 },
      { day: "2024-01-06", egpPerUsdtMinor: 4880 },
    ])
  })

  it("history: upsert same day replaces headline when no range", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875 }, "2024-01-01T12:00:00.000Z")
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4900 }, "2024-01-01T18:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([{ day: "2024-01-01", egpPerUsdtMinor: 4900 }])
  })

  it("history: sorted ascending", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-03", egpPerUsdtMinor: 4900 }, "2024-01-03T12:00:00.000Z")
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875 }, "2024-01-03T12:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 4875 },
      { day: "2024-01-03", egpPerUsdtMinor: 4900 },
    ])
  })

  it("history: older than 90 days dropped", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    // now is 2024-04-01, so anything older than 2024-01-02? 90 days back from 2024-04-01 is 2024-01-02 (Apr 1 - 90 days ~ Jan 2)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875 }, "2024-04-01T00:00:00.000Z")
    await appendP2pHistory(settings, { day: "2024-01-02", egpPerUsdtMinor: 4880 }, "2024-04-01T00:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([{ day: "2024-01-02", egpPerUsdtMinor: 4880 }])
  })

  it("history: invalid point no-op", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "bad", egpPerUsdtMinor: 4875 }, "2024-01-01T00:00:00.000Z")
    expect(store[P2P_RATE_HISTORY_KEY]).toBeUndefined()
  })

  it("history: invalid nowIso no-op", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875 }, "bad")
    expect(store[P2P_RATE_HISTORY_KEY]).toBeUndefined()
  })

  it("history: range round-trip stores min/avg/max with accumulated count/sum", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400 }, "2024-01-01T12:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 1, priceSumMinor: 5070 },
    ])
  })

  it("history: range with explicit count/sum stores them", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(
      settings,
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 10, priceSumMinor: 50700, lastObservedAt: "2024-01-01T12:00:00.000Z" },
      "2024-01-01T12:00:00.000Z",
    )
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 10, priceSumMinor: 50700, lastObservedAt: "2024-01-01T12:00:00.000Z" },
    ])
  })

  it("history: old points without range still read", async () => {
    const settings = makeSettings({
      [P2P_RATE_HISTORY_KEY]: JSON.stringify([{ day: "2024-01-01", egpPerUsdtMinor: 4875 }]),
    })
    expect(await readP2pHistory(settings)).toEqual([{ day: "2024-01-01", egpPerUsdtMinor: 4875 }])
  })

  it("history: invalid range fields omitted but headline kept", async () => {
    const settings = makeSettings({
      [P2P_RATE_HISTORY_KEY]: JSON.stringify([
        { day: "2024-01-01", egpPerUsdtMinor: 4875, minEgpPerUsdtMinor: -1, avgEgpPerUsdtMinor: 48.75, maxEgpPerUsdtMinor: "5400" },
        { day: "2024-01-02", egpPerUsdtMinor: 4880, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 0, maxEgpPerUsdtMinor: 5400 },
      ]),
    })
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 4875 },
      { day: "2024-01-02", egpPerUsdtMinor: 4880, minEgpPerUsdtMinor: 4800, maxEgpPerUsdtMinor: 5400 },
    ])
  })

  it("history: same-day merge accumulates min/max/count/sum with latest headline", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4870, maxEgpPerUsdtMinor: 4950 }, "2024-01-01T12:00:00.000Z")
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 5000, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400 }, "2024-01-01T18:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4970, maxEgpPerUsdtMinor: 5400, offerCount: 2, priceSumMinor: 9940 },
    ])
  })

  it("history: same-day merge preserves range when new point has none", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4870, maxEgpPerUsdtMinor: 4950 }, "2024-01-01T12:00:00.000Z")
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 5300 }, "2024-01-01T20:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5300, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4870, maxEgpPerUsdtMinor: 4950, offerCount: 1, priceSumMinor: 4870 },
    ])
  })

  it("history: same-day merge weighted avg with explicit counts rounds half-up", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 3, priceSumMinor: 14700 }, "2024-01-01T12:00:00.000Z")
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 5000, avgEgpPerUsdtMinor: 5100, maxEgpPerUsdtMinor: 5200, offerCount: 1, priceSumMinor: 5100 }, "2024-01-01T18:00:00.000Z")
    // count 4, sum 19800, avg 4950
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4950, maxEgpPerUsdtMinor: 5200, offerCount: 4, priceSumMinor: 19800 },
    ])
  })

  it("history: skip if incoming lastObservedAt is not newer than stored", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(
      settings,
      { day: "2024-01-01", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 2, priceSumMinor: 9800, lastObservedAt: "2024-01-01T12:00:00.000Z" },
      "2024-01-01T12:00:00.000Z",
    )
    // older or equal lastObservedAt → skip entirely
    await appendP2pHistory(
      settings,
      { day: "2024-01-01", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4700, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5300, offerCount: 2, priceSumMinor: 10000, lastObservedAt: "2024-01-01T12:00:00.000Z" },
      "2024-01-01T12:00:00.000Z",
    )
    await appendP2pHistory(
      settings,
      { day: "2024-01-01", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4700, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5300, offerCount: 2, priceSumMinor: 10000, lastObservedAt: "2024-01-01T11:00:00.000Z" },
      "2024-01-01T12:00:00.000Z",
    )
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 2, priceSumMinor: 9800, lastObservedAt: "2024-01-01T12:00:00.000Z" },
    ])
    // newer → merges
    await appendP2pHistory(
      settings,
      { day: "2024-01-01", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4700, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5300, offerCount: 2, priceSumMinor: 10000, lastObservedAt: "2024-01-01T13:00:00.000Z" },
      "2024-01-01T13:00:00.000Z",
    )
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4700, avgEgpPerUsdtMinor: 4950, maxEgpPerUsdtMinor: 5300, offerCount: 4, priceSumMinor: 19800, lastObservedAt: "2024-01-01T13:00:00.000Z" },
    ])
  })

  it("history: backward compat missing count=1, missing sum=avg*count when merging headline-only point", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 4875 }, "2024-01-01T12:00:00.000Z")
    // merges with ranged observation: existing counts as 1 at 4875
    await appendP2pHistory(
      settings,
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400 },
      "2024-01-01T18:00:00.000Z",
    )
    // count 2, sum 4875+5070=9945, avg 4973 (4972.5 → half-up 4973)
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4973, maxEgpPerUsdtMinor: 5400, offerCount: 2, priceSumMinor: 9945 },
    ])
  })

  it("history: upsert on a new day keeps existing days' range", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    await appendP2pHistory(settings, { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400 }, "2024-01-02T12:00:00.000Z")
    await appendP2pHistory(settings, { day: "2024-01-02", egpPerUsdtMinor: 5300 }, "2024-01-02T12:00:00.000Z")
    expect(await readP2pHistory(settings)).toEqual([
      { day: "2024-01-01", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 1, priceSumMinor: 5070 },
      { day: "2024-01-02", egpPerUsdtMinor: 5300 },
    ])
  })

  describe("p2p settings helpers", () => {
    it("windowDays: default 1, invalid → default", async () => {
      expect(await readP2pWindowDays(makeSettings({}))).toBe(DEFAULT_P2P_WINDOW_DAYS)
      expect(await readP2pWindowDays(makeSettings({ [P2P_WINDOW_DAYS_KEY]: "3" }))).toBe(3)
      expect(await readP2pWindowDays(makeSettings({ [P2P_WINDOW_DAYS_KEY]: "0" }))).toBe(1)
      expect(await readP2pWindowDays(makeSettings({ [P2P_WINDOW_DAYS_KEY]: "31" }))).toBe(1)
      expect(await readP2pWindowDays(makeSettings({ [P2P_WINDOW_DAYS_KEY]: "abc" }))).toBe(1)
      expect(await readP2pWindowDays(makeSettings({ [P2P_WINDOW_DAYS_KEY]: "1.5" }))).toBe(1)
    })

    it("syncInterval: default 300, stored 300 honored, bounds 300-10800", async () => {
      expect(await readP2pSyncIntervalSeconds(makeSettings({}))).toBe(300)
      expect(await readP2pSyncIntervalSeconds(makeSettings({ [P2P_SYNC_INTERVAL_SECONDS_KEY]: "300" }))).toBe(300)
      expect(await readP2pSyncIntervalSeconds(makeSettings({ [P2P_SYNC_INTERVAL_SECONDS_KEY]: "7200" }))).toBe(7200)
      expect(await readP2pSyncIntervalSeconds(makeSettings({ [P2P_SYNC_INTERVAL_SECONDS_KEY]: "10799" }))).toBe(10799)
      expect(await readP2pSyncIntervalSeconds(makeSettings({ [P2P_SYNC_INTERVAL_SECONDS_KEY]: "10800" }))).toBe(10800)
      expect(await readP2pSyncIntervalSeconds(makeSettings({ [P2P_SYNC_INTERVAL_SECONDS_KEY]: "299" }))).toBe(300)
      expect(await readP2pSyncIntervalSeconds(makeSettings({ [P2P_SYNC_INTERVAL_SECONDS_KEY]: "10801" }))).toBe(300)
      expect(await readP2pSyncIntervalSeconds(makeSettings({ [P2P_SYNC_INTERVAL_SECONDS_KEY]: "abc" }))).toBe(300)
    })

    it("writeP2pWindowDays / writeP2pSyncIntervalSeconds validate ranges", async () => {
      const settings = makeSettings({})
      await writeP2pWindowDays(settings, 1)
      expect(await readP2pWindowDays(settings)).toBe(1)
      await writeP2pWindowDays(settings, 30)
      expect(await readP2pWindowDays(settings)).toBe(30)
      await expect(writeP2pWindowDays(settings, 0)).rejects.toThrow(RangeError)
      await expect(writeP2pWindowDays(settings, 31)).rejects.toThrow(RangeError)
      await expect(writeP2pWindowDays(settings, 1.5)).rejects.toThrow(RangeError)

      await writeP2pSyncIntervalSeconds(settings, 300)
      expect(await readP2pSyncIntervalSeconds(settings)).toBe(300)
      await writeP2pSyncIntervalSeconds(settings, 10800)
      expect(await readP2pSyncIntervalSeconds(settings)).toBe(10800)
      const low = await writeP2pSyncIntervalSeconds(settings, 299).catch((e) => e)
      expect(low).toBeInstanceOf(RangeError)
      expect((low as RangeError).message).toContain("300")
      expect((low as RangeError).message).toContain("10800")
      const high = await writeP2pSyncIntervalSeconds(settings, 10801).catch((e) => e)
      expect(high).toBeInstanceOf(RangeError)
      expect((high as RangeError).message).toContain("300")
      expect((high as RangeError).message).toContain("10800")
      await expect(writeP2pSyncIntervalSeconds(settings, 60)).rejects.toThrow(RangeError)
      await expect(writeP2pSyncIntervalSeconds(settings, 59)).rejects.toThrow(RangeError)
      await expect(writeP2pSyncIntervalSeconds(settings, 7.2)).rejects.toThrow(RangeError)
    })

    it("readP2pSettings / writeP2pSettings round-trip with constants", async () => {
      const settings = makeSettings({})
      expect(await readP2pSettings(settings)).toEqual({
        windowHours: 24,
        minWindowHours: 1,
        maxWindowHours: 720,
        syncIntervalSeconds: 300,
        minSyncIntervalSeconds: 300,
        recommendedSyncIntervalSeconds: 300,
        maxSyncIntervalSeconds: 10800,
        outlierSigma: 2,
        minOutlierSigma: 1,
        maxOutlierSigma: 5,
      })
      await writeP2pSettings(settings, { windowHours: 168, syncIntervalSeconds: 300, outlierSigma: 3 })
      expect(await readP2pSettings(settings)).toEqual({
        windowHours: 168,
        minWindowHours: 1,
        maxWindowHours: 720,
        syncIntervalSeconds: 300,
        minSyncIntervalSeconds: 300,
        recommendedSyncIntervalSeconds: 300,
        maxSyncIntervalSeconds: 10800,
        outlierSigma: 3,
        minOutlierSigma: 1,
        maxOutlierSigma: 5,
      })
      await writeP2pSettings(settings, { windowHours: 168, syncIntervalSeconds: 7200, outlierSigma: 3 })
      expect(await readP2pSettings(settings)).toEqual({
        windowHours: 168,
        minWindowHours: 1,
        maxWindowHours: 720,
        syncIntervalSeconds: 7200,
        minSyncIntervalSeconds: 300,
        recommendedSyncIntervalSeconds: 300,
        maxSyncIntervalSeconds: 10800,
        outlierSigma: 3,
        minOutlierSigma: 1,
        maxOutlierSigma: 5,
      })
      // invalid in either field throws without partial write
      await expect(writeP2pSettings(settings, { windowHours: 168, syncIntervalSeconds: 299, outlierSigma: 3 })).rejects.toThrow(RangeError)
      expect(await readP2pSettings(settings)).toEqual({
        windowHours: 168,
        minWindowHours: 1,
        maxWindowHours: 720,
        syncIntervalSeconds: 7200,
        minSyncIntervalSeconds: 300,
        recommendedSyncIntervalSeconds: 300,
        maxSyncIntervalSeconds: 10800,
        outlierSigma: 3,
        minOutlierSigma: 1,
        maxOutlierSigma: 5,
      })
      await expect(writeP2pSettings(settings, { windowHours: 168, syncIntervalSeconds: 10801, outlierSigma: 3 })).rejects.toThrow(RangeError)
      await expect(writeP2pSettings(settings, { windowHours: 168, syncIntervalSeconds: 300, outlierSigma: 6 })).rejects.toThrow(RangeError)
      expect(await readP2pSettings(settings)).toEqual({
        windowHours: 168,
        minWindowHours: 1,
        maxWindowHours: 720,
        syncIntervalSeconds: 7200,
        minSyncIntervalSeconds: 300,
        recommendedSyncIntervalSeconds: 300,
        maxSyncIntervalSeconds: 10800,
        outlierSigma: 3,
        minOutlierSigma: 1,
        maxOutlierSigma: 5,
      })
    })

    it("windowHours: default 24, new key wins, legacy window_days falls back ×24, invalid → 24", async () => {
      expect(await readP2pWindowHours(makeSettings({}))).toBe(DEFAULT_P2P_WINDOW_HOURS)
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_HOURS_KEY]: "48" }))).toBe(48)
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_DAYS_KEY]: "2" }))).toBe(48)
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_DAYS_KEY]: "7" }))).toBe(168)
      // new key wins over legacy
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_HOURS_KEY]: "10", [P2P_WINDOW_DAYS_KEY]: "2" }))).toBe(10)
      // invalid hours → 24 (no legacy)
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_HOURS_KEY]: "0" }))).toBe(24)
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_HOURS_KEY]: "721" }))).toBe(24)
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_HOURS_KEY]: "abc" }))).toBe(24)
      expect(await readP2pWindowHours(makeSettings({ [P2P_WINDOW_HOURS_KEY]: "1.5" }))).toBe(24)
    })

    it("writeP2pWindowHours validates, sets new key and deletes legacy days key", async () => {
      const store: Record<string, string> = { [P2P_WINDOW_DAYS_KEY]: "7" }
      const settings = makeSettings(store)
      await writeP2pWindowHours(settings, 1)
      expect(store[P2P_WINDOW_HOURS_KEY]).toBe("1")
      expect(store[P2P_WINDOW_DAYS_KEY]).toBeUndefined()
      await writeP2pWindowHours(settings, 720)
      expect(await readP2pWindowHours(settings)).toBe(720)
      await expect(writeP2pWindowHours(settings, 0)).rejects.toThrow(RangeError)
      await expect(writeP2pWindowHours(settings, 721)).rejects.toThrow(RangeError)
      await expect(writeP2pWindowHours(settings, 1.5)).rejects.toThrow(RangeError)
    })

    it("outlier sigma: read returns stored 1-5, defaults on absent/malformed, write stores and validates", async () => {
      expect(await readP2pOutlierSigma(makeSettings({}))).toBe(2)
      expect(await readP2pOutlierSigma(makeSettings({ [P2P_OUTLIER_SIGMA_KEY]: "1" }))).toBe(1)
      expect(await readP2pOutlierSigma(makeSettings({ [P2P_OUTLIER_SIGMA_KEY]: "5" }))).toBe(5)
      expect(await readP2pOutlierSigma(makeSettings({ [P2P_OUTLIER_SIGMA_KEY]: "0" }))).toBe(2)
      expect(await readP2pOutlierSigma(makeSettings({ [P2P_OUTLIER_SIGMA_KEY]: "6" }))).toBe(2)
      expect(await readP2pOutlierSigma(makeSettings({ [P2P_OUTLIER_SIGMA_KEY]: "2.5" }))).toBe(2)
      expect(await readP2pOutlierSigma(makeSettings({ [P2P_OUTLIER_SIGMA_KEY]: "abc" }))).toBe(2)

      const store: Record<string, string> = {}
      const settings = makeSettings(store)
      await writeP2pSettings(settings, { windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 4 })
      expect(store[P2P_OUTLIER_SIGMA_KEY]).toBe("4")
      expect(await readP2pOutlierSigma(settings)).toBe(4)
      await expect(writeP2pSettings(settings, { windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 0 })).rejects.toThrow(RangeError)
      await expect(writeP2pSettings(settings, { windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 6 })).rejects.toThrow(RangeError)
      await expect(writeP2pSettings(settings, { windowHours: 24, syncIntervalSeconds: 10_800, outlierSigma: 2.5 })).rejects.toThrow(RangeError)
      expect(await readP2pOutlierSigma(settings)).toBe(4)
    })
  })

  describe("readP2pWindowRange", () => {
    // Legacy day points timestamp at end-of-day: 2024-01-01 -> 23:59:59.999Z, 2024-01-02 -> 23:59:59.999Z
    // now = 2024-01-03T00:00:00.000Z: 48h window includes both, 24h includes only Jan 2
    const windowNow = "2024-01-03T00:00:00.000Z"
    it("aggregates points in time window: min/max/weighted avg/total count", async () => {
      const settings = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 2, priceSumMinor: 9800 },
          { day: "2024-01-02", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5200, offerCount: 2, priceSumMinor: 10000 },
        ]),
      })
      // window 48h: min 4800 max 5200, count 4 sum 19800 avg 4950
      expect(await readP2pWindowRange(settings, 48, windowNow)).toEqual({
        minEgpPerUsdtMinor: 4800,
        avgEgpPerUsdtMinor: 4950,
        maxEgpPerUsdtMinor: 5200,
        adCount: 4,
        priceSumMinor: 19800,
        outlierCount: 0,
      })
      // window 24h: only Jan 2
      expect(await readP2pWindowRange(settings, 24, windowNow)).toEqual({
        minEgpPerUsdtMinor: 4900,
        avgEgpPerUsdtMinor: 5000,
        maxEgpPerUsdtMinor: 5200,
        adCount: 2,
        priceSumMinor: 10000,
        outlierCount: 0,
      })
    })

    it("backward compat: missing count=1, missing sum=avg*count", async () => {
      const settings = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000 },
          { day: "2024-01-02", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5200 },
        ]),
      })
      // each counts 1, sums 4900+5000=9900 avg 4950
      expect(await readP2pWindowRange(settings, 48, windowNow)).toEqual({
        minEgpPerUsdtMinor: 4800,
        avgEgpPerUsdtMinor: 4950,
        maxEgpPerUsdtMinor: 5200,
        adCount: 2,
        priceSumMinor: 9900,
        outlierCount: 0,
      })
    })

    it("uses headline as avg fallback when avg missing", async () => {
      const settings = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([{ day: "2024-01-01", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, maxEgpPerUsdtMinor: 5200 }]),
      })
      expect(await readP2pWindowRange(settings, 48, windowNow)).toEqual({
        minEgpPerUsdtMinor: 4800,
        avgEgpPerUsdtMinor: 5000,
        maxEgpPerUsdtMinor: 5200,
        adCount: 1,
        priceSumMinor: 5000,
        outlierCount: 0,
      })
    })

    it("returns null when no range in window", async () => {
      const settings = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([{ day: "2024-01-01", egpPerUsdtMinor: 5000 }]),
      })
      expect(await readP2pWindowRange(settings, 48, windowNow)).toBeNull()
      expect(await readP2pWindowRange(makeSettings({}), 48, windowNow)).toBeNull()
    })

    it("invalid windowHours falls back to default 24", async () => {
      const settings = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 1, priceSumMinor: 4900 },
          { day: "2024-01-02", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5200, offerCount: 1, priceSumMinor: 5000 },
        ]),
      })
      expect(await readP2pWindowRange(settings, 0, windowNow)).toEqual(await readP2pWindowRange(settings, 24, windowNow))
      expect(await readP2pWindowRange(settings, 721, windowNow)).toEqual(await readP2pWindowRange(settings, 24, windowNow))
    })

    it("time-based window excludes old points and includes current hourly point", async () => {
      const settings = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", hour: "2024-01-01T00:00:00.000Z", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 1, priceSumMinor: 4900, lastObservedAt: "2024-01-01T00:00:00.000Z" },
          { day: "2024-01-02", hour: "2024-01-02T23:00:00.000Z", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5200, offerCount: 1, priceSumMinor: 5000, lastObservedAt: "2024-01-02T23:00:00.000Z" },
        ]),
      })
      // 1h window from 2024-01-03T00:00 includes only the 23:00 point (timestamp 23:00 >= 23:00)
      expect(await readP2pWindowRange(settings, 1, windowNow)).toEqual({
        minEgpPerUsdtMinor: 4900,
        avgEgpPerUsdtMinor: 5000,
        maxEgpPerUsdtMinor: 5200,
        adCount: 1,
        priceSumMinor: 5000,
        outlierCount: 0,
      })
    })

    it("pools σ and sums outliers across window; missing σ contributes between-mean term only; no σ omits stdDev", async () => {
      const pooled = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", egpPerUsdtMinor: 4900, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 3, priceSumMinor: 14700, stdDevEgpPerUsdtMinor: 10, outlierCount: 1 },
          { day: "2024-01-02", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 5000, avgEgpPerUsdtMinor: 5100, maxEgpPerUsdtMinor: 5200, offerCount: 1, priceSumMinor: 5100, stdDevEgpPerUsdtMinor: 30, outlierCount: 2 },
        ]),
      })
      // total 4, sum 19800, mean 4950, outliers 3
      // var = (3*(10² + (4900-4950)²) + 1*(30² + (5100-4950)²)) / 4 = 31200/4 = 7800
      // σ = floor(sqrt(7800)+0.5) = 88
      expect(await readP2pWindowRange(pooled, 48, windowNow)).toEqual({
        minEgpPerUsdtMinor: 4800,
        avgEgpPerUsdtMinor: 4950,
        maxEgpPerUsdtMinor: 5200,
        adCount: 4,
        priceSumMinor: 19800,
        outlierCount: 3,
        stdDevEgpPerUsdtMinor: 88,
      })

      const missingSigma = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", egpPerUsdtMinor: 4900, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 2, priceSumMinor: 9800, outlierCount: 0 },
          { day: "2024-01-02", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 5000, avgEgpPerUsdtMinor: 5100, maxEgpPerUsdtMinor: 5200, offerCount: 2, priceSumMinor: 10200, stdDevEgpPerUsdtMinor: 20, outlierCount: 1 },
        ]),
      })
      // total 4, sum 20000, mean 5000
      // var = (2*(0 + (4900-5000)²) + 2*(20² + (5100-5000)²)) / 4 = 40800/4 = 10200
      // σ = floor(sqrt(10200)+0.5) = 101
      expect(await readP2pWindowRange(missingSigma, 48, windowNow)).toEqual({
        minEgpPerUsdtMinor: 4800,
        avgEgpPerUsdtMinor: 5000,
        maxEgpPerUsdtMinor: 5200,
        adCount: 4,
        priceSumMinor: 20000,
        outlierCount: 1,
        stdDevEgpPerUsdtMinor: 101,
      })

      const noSigma = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", egpPerUsdtMinor: 4900, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 1, priceSumMinor: 4900 },
          { day: "2024-01-02", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 5000, avgEgpPerUsdtMinor: 5100, maxEgpPerUsdtMinor: 5200, offerCount: 1, priceSumMinor: 5100 },
        ]),
      })
      const result = await readP2pWindowRange(noSigma, 48, windowNow)
      expect(result).not.toBeNull()
      expect(result).not.toHaveProperty("stdDevEgpPerUsdtMinor")
      expect(result?.outlierCount).toBe(0)
    })
  })

  describe("hourly history", () => {
    it("p2pHourKey buckets to UTC hour and rejects invalid", () => {
      expect(p2pHourKey("2024-01-01T15:30:00.000Z")).toBe("2024-01-01T15:00:00.000Z")
      expect(p2pHourKey("2024-01-01T00:00:00.000Z")).toBe("2024-01-01T00:00:00.000Z")
      expect(p2pHourKey("not-a-date")).toBeNull()
    })

    it("history: same-hour merge accumulates min/max/count/sum", async () => {
      const store: Record<string, string> = {}
      const settings = makeSettings(store)
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 4875, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4870, maxEgpPerUsdtMinor: 4950, lastObservedAt: "2024-01-01T10:10:00.000Z" }, "2024-01-01T10:10:00.000Z")
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 5000, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, lastObservedAt: "2024-01-01T10:40:00.000Z" }, "2024-01-01T10:40:00.000Z")
      expect(await readP2pHistory(settings)).toEqual([
        { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4970, maxEgpPerUsdtMinor: 5400, offerCount: 2, priceSumMinor: 9940, lastObservedAt: "2024-01-01T10:40:00.000Z" },
      ])
    })

    it("history: same-hour merge pools stddev and sums outliers (exact rounded σ)", async () => {
      const store: Record<string, string> = {}
      const settings = makeSettings(store)
      await appendP2pHistory(
        settings,
        {
          day: "2024-01-01",
          hour: "2024-01-01T10:00:00.000Z",
          egpPerUsdtMinor: 4875,
          minEgpPerUsdtMinor: 4800,
          avgEgpPerUsdtMinor: 4870,
          maxEgpPerUsdtMinor: 4950,
          offerCount: 3,
          priceSumMinor: 14610,
          stdDevEgpPerUsdtMinor: 10,
          outlierCount: 1,
          lastObservedAt: "2024-01-01T10:10:00.000Z",
        },
        "2024-01-01T10:10:00.000Z",
      )
      await appendP2pHistory(
        settings,
        {
          day: "2024-01-01",
          hour: "2024-01-01T10:00:00.000Z",
          egpPerUsdtMinor: 5200,
          minEgpPerUsdtMinor: 5000,
          avgEgpPerUsdtMinor: 5070,
          maxEgpPerUsdtMinor: 5400,
          offerCount: 2,
          priceSumMinor: 10140,
          stdDevEgpPerUsdtMinor: 20,
          outlierCount: 3,
          lastObservedAt: "2024-01-01T10:40:00.000Z",
        },
        "2024-01-01T10:40:00.000Z",
      )
      // count 5, sum 24750, avg 4950, outliers 4
      // σ² = (3*(10² + (4870-4950)²) + 2*(20² + (5070-4950)²)) / 5 = 49100/5 = 9820
      // σ = floor(sqrt(9820)+0.5) = 99
      expect(await readP2pHistory(settings)).toEqual([
        {
          day: "2024-01-01",
          hour: "2024-01-01T10:00:00.000Z",
          egpPerUsdtMinor: 5200,
          minEgpPerUsdtMinor: 4800,
          avgEgpPerUsdtMinor: 4950,
          maxEgpPerUsdtMinor: 5400,
          offerCount: 5,
          priceSumMinor: 24750,
          stdDevEgpPerUsdtMinor: 99,
          outlierCount: 4,
          lastObservedAt: "2024-01-01T10:40:00.000Z",
        },
      ])
    })

    it("history: same-hour merge without stddev/outlierCount does not gain those fields", async () => {
      const store: Record<string, string> = {}
      const settings = makeSettings(store)
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 4875, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4870, maxEgpPerUsdtMinor: 4950, lastObservedAt: "2024-01-01T10:10:00.000Z" }, "2024-01-01T10:10:00.000Z")
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 5000, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, lastObservedAt: "2024-01-01T10:40:00.000Z" }, "2024-01-01T10:40:00.000Z")
      const hist = await readP2pHistory(settings)
      expect(hist[0]).not.toHaveProperty("stdDevEgpPerUsdtMinor")
      expect(hist[0]).not.toHaveProperty("outlierCount")
    })

    it("history: distinct hours are distinct points sorted by timestamp", async () => {
      const store: Record<string, string> = {}
      const settings = makeSettings(store)
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T11:00:00.000Z", egpPerUsdtMinor: 5100 }, "2024-01-01T11:00:00.000Z")
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5000 }, "2024-01-01T11:00:00.000Z")
      expect(await readP2pHistory(settings)).toEqual([
        { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5000 },
        { day: "2024-01-01", hour: "2024-01-01T11:00:00.000Z", egpPerUsdtMinor: 5100 },
      ])
    })

    it("history: legacy day point read and sorts at end of day", async () => {
      const settings = makeSettings({
        [P2P_RATE_HISTORY_KEY]: JSON.stringify([
          { day: "2024-01-01", egpPerUsdtMinor: 5000 },
          { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 4900 },
          { day: "2024-01-01", hour: "bogus", egpPerUsdtMinor: 4800 },
        ]),
      })
      // invalid hour omitted, legacy point kept
      expect(await readP2pHistory(settings)).toEqual([
        { day: "2024-01-01", egpPerUsdtMinor: 5000 },
        { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 4900 },
        { day: "2024-01-01", egpPerUsdtMinor: 4800 },
      ])
      // append triggers sort: hourly (10:00) before legacy day (23:59:59.999)
      const store: Record<string, string> = { [P2P_RATE_HISTORY_KEY]: JSON.stringify([{ day: "2024-01-01", egpPerUsdtMinor: 5000 }]) }
      const s2 = makeSettings(store)
      await appendP2pHistory(s2, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 4900 }, "2024-01-01T10:00:00.000Z")
      const hist = await readP2pHistory(s2)
      expect(hist[0]).toEqual({ day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 4900 })
      expect(hist[1]).toEqual({ day: "2024-01-01", egpPerUsdtMinor: 5000 })
    })

    it("history: ranged observation upgrades bare point at same timestamp", async () => {
      const store: Record<string, string> = {}
      const settings = makeSettings(store)
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5000, lastObservedAt: "2024-01-01T10:00:00.000Z" }, "2024-01-01T10:00:00.000Z")
      await appendP2pHistory(settings, { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, lastObservedAt: "2024-01-01T10:00:00.000Z" }, "2024-01-01T10:00:00.000Z")
      const hist = await readP2pHistory(settings)
      expect(hist[0].minEgpPerUsdtMinor).toBe(4800)
      expect(hist[0].maxEgpPerUsdtMinor).toBe(5400)
      expect(hist[0].egpPerUsdtMinor).toBe(5200)
    })
  })
})
