import { describe, expect, it } from "vitest"
import { createP2pRateReader, readP2pLatestRate } from "@/treasury/application/p2p-rate"
import { P2P_RATE_HISTORY_KEY, P2P_RATE_LAST_KEY, P2P_SYNC_INTERVAL_SECONDS_KEY } from "@/treasury/application/p2p-rate-settings"
import { SettingsRepository } from "@/shared/settings-repository"
import { P2pQuoteProvider } from "@/treasury/application/p2p-rate"

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

describe("p2p-rate reader", () => {
  it("(a) first read → provider called once, source \"binance-p2p\", stale false", async () => {
    let calls = 0
    let lastOptions: unknown
    const provider: P2pQuoteProvider = {
      readQuote: async (options) => {
        calls++
        lastOptions = options
        return { egpPerUsdtMinor: 4875, fetchedAt: "2024-01-01T00:00:00.000Z" }
      },
    }
    const settings = makeSettings({})
    const now = () => "2024-01-01T00:00:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    const res = await reader.read()
    expect(calls).toBe(1)
    expect(lastOptions).toEqual({ outlierSigma: 2 })
    expect(res?.source).toBe("binance-p2p")
    expect(res?.stale).toBe(false)
  })

  it("(b) read again within TTL → provider still called once (cached)", async () => {
    let calls = 0
    const nowVals = ["2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:30.000Z"]
    let i = 0
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        calls++
        return { egpPerUsdtMinor: 4875, fetchedAt: nowVals[0] }
      },
    }
    const settings = makeSettings({})
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    await reader.read()
    expect(calls).toBe(1)
  })

  it("(c) read after TTL → called twice", async () => {
    let calls = 0
    const nowVals = ["2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T03:00:00.001Z"]
    let i = 0
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        calls++
        return { egpPerUsdtMinor: 4875, fetchedAt: nowVals[0] }
      },
    }
    const settings = makeSettings({})
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]
    const reader = createP2pRateReader({ provider, settings, now, ttlMs: 60_000 })
    await reader.read()
    await reader.read()
    expect(calls).toBe(2)
  })

  it("(d) provider throws with cache present (even expired) → cached value, stale true", async () => {
    let calls = 0
    const nowVals = ["2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T03:00:00.001Z"]
    let i = 0
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        calls++
        if (calls === 1) {
          return { egpPerUsdtMinor: 4875, fetchedAt: nowVals[0] }
        }
        throw new Error("fail")
      },
    }
    const settings = makeSettings({})
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]
    const reader = createP2pRateReader({ provider, settings, now, ttlMs: 60_000 })
    const first = await reader.read()
    expect(first?.egpPerUsdtMinor).toBe(4875)
    const second = await reader.read()
    expect(second?.egpPerUsdtMinor).toBe(4875)
    expect(second?.stale).toBe(true)
    expect(second?.source).toBe("binance-p2p")
  })

  it("(e) provider throws, no cache, manual set → source \"settings:manual\", stale true, fetchedAt null", async () => {
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        throw new Error("fail")
      },
    }
    const settings = makeSettings({ "rate:usdt:p2p": "4900" })
    const now = () => "2024-01-01T00:00:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    const res = await reader.read()
    expect(res?.egpPerUsdtMinor).toBe(4900)
    expect(res?.source).toBe("settings:manual")
    expect(res?.stale).toBe(true)
    expect(res?.fetchedAt).toBe(null)
  })

  it("(f) provider throws, no cache, no manual, last-known stored → source \"settings:last-known\", stale true, fetchedAt = stored at", async () => {
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        throw new Error("fail")
      },
    }
    const at = "2024-01-01T00:00:00.000Z"
    const settings = makeSettings({ [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at }) })
    const now = () => "2024-01-01T01:00:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    const res = await reader.read()
    expect(res?.egpPerUsdtMinor).toBe(4875)
    expect(res?.source).toBe("settings:last-known")
    expect(res?.stale).toBe(true)
    expect(res?.fetchedAt).toBe(at)
  })

  it("(g) provider throws, nothing available → null", async () => {
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        throw new Error("fail")
      },
    }
    const settings = makeSettings({})
    const now = () => "2024-01-01T00:00:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    const res = await reader.read()
    expect(res).toBe(null)
  })

  it("(h) fresh success persists last-known (assert settings.set called with P2P_RATE_LAST_KEY and correct JSON)", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    const provider: P2pQuoteProvider = {
      readQuote: async () => ({ egpPerUsdtMinor: 4875, fetchedAt: "2024-01-01T00:00:00.000Z" }),
    }
    const now = () => "2024-01-01T00:00:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    expect(store[P2P_RATE_LAST_KEY]).toBe(JSON.stringify({ minor: 4875, at: "2024-01-01T00:00:00.000Z" }))
  })

  it("(i) settings.set throws during persist → read still returns the live rate", async () => {
    const settings: SettingsRepository = {
      get: async () => null,
      set: async () => {
        throw new Error("fail")
      },
      delete: async () => {},
      all: async () => ({}),
    }
    const provider: P2pQuoteProvider = {
      readQuote: async () => ({ egpPerUsdtMinor: 4875, fetchedAt: "2024-01-01T00:00:00.000Z" }),
    }
    const now = () => "2024-01-01T00:00:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    const res = await reader.read()
    expect(res?.egpPerUsdtMinor).toBe(4875)
    expect(res?.source).toBe("binance-p2p")
    expect(res?.stale).toBe(false)
  })

  it("history: successful fresh read appends a history point for the quote's UTC hour", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    const provider: P2pQuoteProvider = {
      readQuote: async () => ({ egpPerUsdtMinor: 4875, fetchedAt: "2024-01-01T15:30:00.000Z" }),
    }
    const now = () => "2024-01-01T15:30:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    expect(JSON.parse(store[P2P_RATE_HISTORY_KEY])).toEqual([{ day: "2024-01-01", hour: "2024-01-01T15:00:00.000Z", egpPerUsdtMinor: 4875, lastObservedAt: "2024-01-01T15:30:00.000Z" }])
  })

  it("history: a cache hit does not append again", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    const nowVals = ["2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:30.000Z"]
    let i = 0
    const provider: P2pQuoteProvider = {
      readQuote: async () => ({ egpPerUsdtMinor: 4875, fetchedAt: nowVals[0] }),
    }
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    await reader.read()
    expect(JSON.parse(store[P2P_RATE_HISTORY_KEY])).toEqual([{ day: "2024-01-01", hour: "2024-01-01T00:00:00.000Z", egpPerUsdtMinor: 4875, lastObservedAt: "2024-01-01T00:00:00.000Z" }])
  })

  it("passes through per-method fields on a fresh quote and returns null for a manual fallback", async () => {
    const range = { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, adCount: 10 }
    const provider: P2pQuoteProvider = {
      readQuote: async () => ({
        egpPerUsdtMinor: 5200,
        fetchedAt: "2024-01-01T00:00:00.000Z",
        bankTransferEgpPerUsdtMinor: 5200,
        vodafoneEgpPerUsdtMinor: 4900,
        range,
      }),
    }
    const reader = createP2pRateReader({ provider, settings: makeSettings({}), now: () => "2024-01-01T00:00:00.000Z" })
    const fresh = await reader.read()
    expect(fresh?.bankTransferEgpPerUsdtMinor).toBe(5200)
    expect(fresh?.vodafoneEgpPerUsdtMinor).toBe(4900)
    expect(fresh?.range).toEqual(range)

    const fallbackReader = createP2pRateReader({
      provider: { readQuote: async () => { throw new Error("fail") } },
      settings: makeSettings({ "rate:usdt:p2p": "4900" }),
      now: () => "2024-01-01T00:00:00.000Z",
    })
    const fallback = await fallbackReader.read()
    expect(fallback?.bankTransferEgpPerUsdtMinor).toBeNull()
    expect(fallback?.vodafoneEgpPerUsdtMinor).toBeNull()
    expect(fallback?.range).toBeNull()
  })

  it("ranges survive cache-hit and stale paths, and are null for a last-known fallback", async () => {
    const range = { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, adCount: 10 }
    let calls = 0
    // Each fresh read consumes three now() calls (start, cache stamp, history
    // stamp); the cache hit consumes one and the stale read one.
    const nowVals = ["2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:02:00.000Z", "2024-01-01T00:05:00.001Z"]
    let i = 0
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        calls++
        if (calls === 1) {
          return {
            egpPerUsdtMinor: 5200,
            fetchedAt: nowVals[0],
            bankTransferEgpPerUsdtMinor: 5200,
            vodafoneEgpPerUsdtMinor: 4900,
            range,
          }
        }
        throw new Error("fail")
      },
    }
    const settings = makeSettings({})
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]
    const reader = createP2pRateReader({ provider, settings, now, ttlMs: 300_000 })

    const fresh = await reader.read()
    expect(fresh?.range).toEqual(range)

    // Cache hit: second read within TTL serves the cached range.
    const cached = await reader.read()
    expect(cached?.stale).toBe(false)
    expect(cached?.range).toEqual(range)

    // Stale: provider fails after TTL, cached range is still served.
    const stale = await reader.read()
    expect(stale?.stale).toBe(true)
    expect(stale?.range).toEqual(range)

    const lastKnownReader = createP2pRateReader({
      provider: { readQuote: async () => { throw new Error("fail") } },
      settings: makeSettings({ [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at: "2024-01-01T00:00:00.000Z" }) }),
      now: () => "2024-01-01T01:00:00.000Z",
    })
    const lastKnown = await lastKnownReader.read()
    expect(lastKnown?.source).toBe("settings:last-known")
    expect(lastKnown?.range).toBeNull()
  })

  it("history: fresh quote with range appends range to history point", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    const range = { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, adCount: 10, priceSumMinor: 50700, stdDevEgpPerUsdtMinor: 190, outlierCount: 2 }
    const provider: P2pQuoteProvider = {
      readQuote: async () => ({ egpPerUsdtMinor: 5200, fetchedAt: "2024-01-01T15:30:00.000Z", range }),
    }
    const now = () => "2024-01-01T15:30:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    expect(JSON.parse(store[P2P_RATE_HISTORY_KEY])).toEqual([
      { day: "2024-01-01", hour: "2024-01-01T15:00:00.000Z", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 10, priceSumMinor: 50700, stdDevEgpPerUsdtMinor: 190, outlierCount: 2, lastObservedAt: "2024-01-01T15:30:00.000Z" },
    ])
  })

  it("history: fresh quote with range lacking stdDev/outlierCount omits those keys from the stored point", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    const range = { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, adCount: 10, priceSumMinor: 50700 }
    const provider: P2pQuoteProvider = {
      readQuote: async () => ({ egpPerUsdtMinor: 5200, fetchedAt: "2024-01-01T15:30:00.000Z", range }),
    }
    const now = () => "2024-01-01T15:30:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    const persisted = JSON.parse(store[P2P_RATE_HISTORY_KEY])
    expect(persisted).toEqual([
      { day: "2024-01-01", hour: "2024-01-01T15:00:00.000Z", egpPerUsdtMinor: 5200, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 5070, maxEgpPerUsdtMinor: 5400, offerCount: 10, priceSumMinor: 50700, lastObservedAt: "2024-01-01T15:30:00.000Z" },
    ])
    expect(persisted[0]).not.toHaveProperty("stdDevEgpPerUsdtMinor")
    expect(persisted[0]).not.toHaveProperty("outlierCount")
  })

  it("history: second fresh observation in distinct hour is a distinct point", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    let calls = 0
    const quotes = [
      { egpPerUsdtMinor: 5000, fetchedAt: "2024-01-01T10:00:00.000Z", range: { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, adCount: 2, priceSumMinor: 9800 } },
      { egpPerUsdtMinor: 5100, fetchedAt: "2024-01-01T13:00:00.000Z", range: { minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5200, adCount: 2, priceSumMinor: 10000 } },
    ]
    const provider: P2pQuoteProvider = {
      readQuote: async () => quotes[calls++]!,
    }
    let nowCalls = 0
    const times = ["2024-01-01T10:00:00.000Z", "2024-01-01T10:00:00.000Z", "2024-01-01T10:00:00.000Z", "2024-01-01T13:00:00.001Z", "2024-01-01T13:00:00.001Z", "2024-01-01T13:00:00.001Z"]
    const now = () => times[Math.min(nowCalls++, times.length - 1)]!
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    await reader.read()
    expect(JSON.parse(store[P2P_RATE_HISTORY_KEY])).toEqual([
      { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5000, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, offerCount: 2, priceSumMinor: 9800, lastObservedAt: "2024-01-01T10:00:00.000Z" },
      { day: "2024-01-01", hour: "2024-01-01T13:00:00.000Z", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5200, offerCount: 2, priceSumMinor: 10000, lastObservedAt: "2024-01-01T13:00:00.000Z" },
    ])
  })

  it("history: second fresh observation same hour accumulates into one point", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    let calls = 0
    const quotes = [
      { egpPerUsdtMinor: 5000, fetchedAt: "2024-01-01T10:00:00.000Z", range: { minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4900, maxEgpPerUsdtMinor: 5000, adCount: 2, priceSumMinor: 9800 } },
      { egpPerUsdtMinor: 5100, fetchedAt: "2024-01-01T10:30:00.000Z", range: { minEgpPerUsdtMinor: 4900, avgEgpPerUsdtMinor: 5000, maxEgpPerUsdtMinor: 5200, adCount: 2, priceSumMinor: 10000 } },
    ]
    const provider: P2pQuoteProvider = { readQuote: async () => quotes[calls++]! }
    let nowCalls = 0
    const times = ["2024-01-01T10:00:00.000Z", "2024-01-01T10:00:00.000Z", "2024-01-01T10:00:00.000Z", "2024-01-01T13:00:00.001Z", "2024-01-01T13:00:00.001Z", "2024-01-01T13:00:00.001Z"]
    const now = () => times[Math.min(nowCalls++, times.length - 1)]!
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    await reader.read()
    expect(JSON.parse(store[P2P_RATE_HISTORY_KEY])).toEqual([
      { day: "2024-01-01", hour: "2024-01-01T10:00:00.000Z", egpPerUsdtMinor: 5100, minEgpPerUsdtMinor: 4800, avgEgpPerUsdtMinor: 4950, maxEgpPerUsdtMinor: 5200, offerCount: 4, priceSumMinor: 19800, lastObservedAt: "2024-01-01T10:30:00.000Z" },
    ])
  })

  it("ttl: sync interval setting drives cache TTL when no ttlMs override", async () => {
    const store: Record<string, string> = {}
    const settings = makeSettings(store)
    // Explicit interval: 10_800s. Cache hit before 3h, refetch after 3h + 1ms.
    const { writeP2pSyncIntervalSeconds } = await import("./p2p-rate-settings")
    await writeP2pSyncIntervalSeconds(settings, 10_800)
    let calls = 0
    const firstAt = "2024-01-01T00:00:00.000Z"
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        calls++
        return { egpPerUsdtMinor: 4875, fetchedAt: firstAt }
      },
    }
    const beforeExpiry = "2024-01-01T02:59:59.999Z"
    const afterExpiry = "2024-01-01T03:00:00.001Z"
    const nowVals = [firstAt, firstAt, firstAt, beforeExpiry, afterExpiry, afterExpiry, afterExpiry]
    let i = 0
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]!
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    await reader.read()
    expect(calls).toBe(1)
    await reader.read()
    expect(calls).toBe(2)
  })

  it("ttl: when sync interval settings read throws, fallback TTL is 300s", async () => {
    const settings: SettingsRepository = {
      get: async () => {
        throw new Error("settings unavailable")
      },
      set: async () => {},
      delete: async () => {},
      all: async () => ({}),
    }
    let calls = 0
    const firstAt = "2024-01-01T00:00:00.000Z"
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        calls++
        return { egpPerUsdtMinor: 4875, fetchedAt: firstAt }
      },
    }
    // 300s = 5m. Cache hit before 5m, refetch after 5m + 1ms.
    const beforeExpiry = "2024-01-01T00:04:59.999Z" // +299_999ms
    const afterExpiry = "2024-01-01T00:05:00.001Z" // +300_001ms
    const nowVals = [firstAt, firstAt, firstAt, beforeExpiry, afterExpiry, afterExpiry, afterExpiry]
    let i = 0
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]!
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    await reader.read()
    expect(calls).toBe(1)
    await reader.read()
    expect(calls).toBe(2)
  })

  it("ttl: explicit ttlMs below minimum clamps to minimum", async () => {
    let calls = 0
    const nowVals = ["2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:10.000Z"]
    let i = 0
    const provider: P2pQuoteProvider = {
      readQuote: async () => {
        calls++
        return { egpPerUsdtMinor: 4875, fetchedAt: nowVals[0] }
      },
    }
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]!
    const reader = createP2pRateReader({ provider, settings: makeSettings({}), now, ttlMs: 1000 })
    await reader.read()
    await reader.read()
    // 10s < clamped 300s → still cached
    expect(calls).toBe(1)
  })

  it("history: manual fallback does not append", async () => {
    const store: Record<string, string> = { "rate:usdt:p2p": "4900" }
    const settings = makeSettings(store)
    const provider: P2pQuoteProvider = {
      readQuote: async () => { throw new Error("fail") },
    }
    const now = () => "2024-01-01T15:30:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    const res = await reader.read()
    expect(res?.source).toBe("settings:manual")
    expect(store[P2P_RATE_HISTORY_KEY]).toBeUndefined()
  })

  it("history: last-known fallback does not append", async () => {
    const store: Record<string, string> = { [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at: "2024-01-01T00:00:00.000Z" }) }
    const settings = makeSettings(store)
    const provider: P2pQuoteProvider = {
      readQuote: async () => { throw new Error("fail") },
    }
    const now = () => "2024-01-01T15:30:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    const res = await reader.read()
    expect(res?.source).toBe("settings:last-known")
    expect(store[P2P_RATE_HISTORY_KEY]).toBeUndefined()
  })

  describe("readP2pLatestRate", () => {
    it("returns null when there is no last-known price", async () => {
      const settings = makeSettings({})
      await expect(readP2pLatestRate(settings, "2024-01-01T01:00:00.000Z")).resolves.toBeNull()
    })

    it("reads last-known 100s old with interval 300s as not stale", async () => {
      const at = "2024-01-01T00:00:00.000Z"
      const settings = makeSettings({
        [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at }),
        [P2P_SYNC_INTERVAL_SECONDS_KEY]: "300",
      })
      await expect(readP2pLatestRate(settings, "2024-01-01T00:01:40.000Z")).resolves.toEqual({
        egpPerUsdtMinor: 4875,
        fetchedAt: at,
        stale: false,
      })
    })

    it("reads last-known 500s old with interval 300s as not stale (2x grace)", async () => {
      const at = "2024-01-01T00:00:00.000Z"
      const settings = makeSettings({
        [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at }),
        [P2P_SYNC_INTERVAL_SECONDS_KEY]: "300",
      })
      await expect(readP2pLatestRate(settings, "2024-01-01T00:08:20.000Z")).resolves.toEqual({
        egpPerUsdtMinor: 4875,
        fetchedAt: at,
        stale: false,
      })
    })

    it("reads last-known 700s old with interval 300s as stale", async () => {
      const at = "2024-01-01T00:00:00.000Z"
      const settings = makeSettings({
        [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at }),
        [P2P_SYNC_INTERVAL_SECONDS_KEY]: "300",
      })
      await expect(readP2pLatestRate(settings, "2024-01-01T00:11:40.000Z")).resolves.toEqual({
        egpPerUsdtMinor: 4875,
        fetchedAt: at,
        stale: true,
      })
    })

    it("uses the stored sync interval for staleness", async () => {
      const at = "2024-01-01T00:00:00.000Z"
      const settings = makeSettings({
        [P2P_RATE_LAST_KEY]: JSON.stringify({ minor: 4875, at }),
        [P2P_SYNC_INTERVAL_SECONDS_KEY]: "7200",
      })
      await expect(readP2pLatestRate(settings, "2024-01-01T01:00:00.000Z")).resolves.toEqual({
        egpPerUsdtMinor: 4875,
        fetchedAt: at,
        stale: false,
      })
      await expect(readP2pLatestRate(settings, "2024-01-01T05:00:00.000Z")).resolves.toEqual({
        egpPerUsdtMinor: 4875,
        fetchedAt: at,
        stale: true,
      })
    })
  })

  it("passes outlierSigma from settings to provider (default 2, stored 3)", async () => {
    const calls: unknown[] = []
    const provider: P2pQuoteProvider = {
      readQuote: async (options) => {
        calls.push(options)
        return { egpPerUsdtMinor: 4875, fetchedAt: "2024-01-01T00:00:00.000Z" }
      },
    }
    const settings = makeSettings({ "p2p:outlier_sigma": "3" })
    const now = () => "2024-01-01T00:00:00.000Z"
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    expect(calls).toEqual([{ outlierSigma: 3 }])
  })

  it("changing stored sigma within TTL forces a provider refetch with the new sigma", async () => {
    const store: Record<string, string> = { "p2p:outlier_sigma": "2" }
    const settings = makeSettings(store)
    const calls: unknown[] = []
    // read 1: start, cache stamp, history stamp; read 2 (cache hit would be 1 now): start only
    const nowVals = [
      "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z",
      "2024-01-01T00:00:30.000Z", "2024-01-01T00:00:30.000Z", "2024-01-01T00:00:30.000Z",
    ]
    let i = 0
    const provider: P2pQuoteProvider = {
      readQuote: async (options) => {
        calls.push(options)
        return { egpPerUsdtMinor: 4875, fetchedAt: "2024-01-01T00:00:00.000Z" }
      },
    }
    const now = () => nowVals[i++] || nowVals[nowVals.length - 1]
    const reader = createP2pRateReader({ provider, settings, now })
    await reader.read()
    expect(calls).toEqual([{ outlierSigma: 2 }])
    store["p2p:outlier_sigma"] = "3"
    await reader.read()
    expect(calls).toEqual([{ outlierSigma: 2 }, { outlierSigma: 3 }])
  })
})
