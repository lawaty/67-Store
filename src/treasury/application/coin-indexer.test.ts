import { describe, expect, test } from "vitest"
import type { SettingsRepository } from "@/shared/settings-repository"
import type { CostHistoryReader, ProductCostChange } from "@/catalogue"
import { createCoinIndexer } from "./coin-indexer"
import {
  COIN_INDEX_CAP_BPS_KEY,
  COIN_INDEX_LAST_RUN_KEY,
  COIN_INDEX_MICRO_KEY,
  COIN_INDEX_UPDATED_AT_KEY,
  readCoinIndex,
} from "./coin-index-settings"

function createInMemorySettings(initial: Record<string, string> = {}): SettingsRepository {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async set(key, value) {
      store.set(key, value)
    },
    async delete(key) {
      store.delete(key)
    },
    async all() {
      return Object.fromEntries(store)
    },
  }
}

function createFakeHistory(opts: {
  changes?: readonly ProductCostChange[]
  latest?: string | null
}): CostHistoryReader & { listCalls: Array<string | null> } {
  const calls: Array<string | null> = []
  return {
    listCalls: calls,
    async listCostChangesSince(lastIndexedAt) {
      calls.push(lastIndexedAt)
      return opts.changes ?? []
    },
    async latestCostRecordedAt() {
      return opts.latest ?? null
    },
  }
}

describe("coin-indexer", () => {
  test("first run sets baseline timestamp with no ratios and keeps index at 1.0", async () => {
    const settings = createInMemorySettings()
    const history = createFakeHistory({ changes: [], latest: "2026-11-06T10:00:00.000Z" })
    const update = createCoinIndexer({ history, settings })

    const state = await update()

    expect(history.listCalls).toEqual([null])
    expect(state.indexMicro).toBe(1_000_000)
    expect(state.updatedAt).toBe("2026-11-06T10:00:00.000Z")
    expect(state.lastRun).toEqual({
      fromIndexMicro: 1_000_000,
      toIndexMicro: 1_000_000,
      meanRatioBps: 10_000,
      capped: false,
      products: 0,
      at: "2026-11-06T10:00:00.000Z",
    })
    expect(await readCoinIndex(settings)).toMatchObject({
      indexMicro: 1_000_000,
      updatedAt: "2026-11-06T10:00:00.000Z",
    })
  })

  test("applies +10% move from last indexed costs", async () => {
    const settings = createInMemorySettings({
      [COIN_INDEX_MICRO_KEY]: "1000000",
      [COIN_INDEX_CAP_BPS_KEY]: "500",
      [COIN_INDEX_UPDATED_AT_KEY]: "2026-11-05T00:00:00.000Z",
    })
    const history = createFakeHistory({
      changes: [{ productId: "g:1", previousCostMinor: 100, currentCostMinor: 110 }],
      latest: "2026-11-06T00:00:00.000Z",
    })

    await createCoinIndexer({ history, settings })()

    expect(history.listCalls).toEqual(["2026-11-05T00:00:00.000Z"])
    const state = await readCoinIndex(settings)
    expect(state.indexMicro).toBe(1_050_000)
    expect(state.lastRun).toMatchObject({
      fromIndexMicro: 1_000_000,
      toIndexMicro: 1_050_000,
      meanRatioBps: 11_000,
      capped: true,
      products: 1,
      at: "2026-11-06T00:00:00.000Z",
    })
  })

  test("caps move at 5% (500 bps)", async () => {
    const settings = createInMemorySettings({
      [COIN_INDEX_MICRO_KEY]: "1000000",
      [COIN_INDEX_CAP_BPS_KEY]: "500",
      [COIN_INDEX_UPDATED_AT_KEY]: "2026-11-05T00:00:00.000Z",
    })
    const history = createFakeHistory({
      changes: [{ productId: "g:1", previousCostMinor: 100, currentCostMinor: 120 }],
      latest: "2026-11-06T00:00:00.000Z",
    })

    await createCoinIndexer({ history, settings })()

    expect(await readCoinIndex(settings)).toMatchObject({
      indexMicro: 1_050_000,
      lastRun: { meanRatioBps: 12_000, capped: true, products: 1 },
    })
  })

  test("no-change ratio keeps index stable and still records baseline timestamp", async () => {
    const settings = createInMemorySettings({
      [COIN_INDEX_MICRO_KEY]: "1025000",
      [COIN_INDEX_CAP_BPS_KEY]: "500",
      [COIN_INDEX_UPDATED_AT_KEY]: "2026-11-05T00:00:00.000Z",
    })
    const history = createFakeHistory({
      changes: [{ productId: "g:1", previousCostMinor: 100, currentCostMinor: 100 }],
      latest: "2026-11-06T00:00:00.000Z",
    })

    await createCoinIndexer({ history, settings })()

    expect(await readCoinIndex(settings)).toMatchObject({
      indexMicro: 1_025_000,
      updatedAt: "2026-11-06T00:00:00.000Z",
      lastRun: { meanRatioBps: 10_000, capped: false, products: 1 },
    })
  })

  test("new product with no prior row is skipped (no ratios) and baseline timestamp is persisted", async () => {
    const settings = createInMemorySettings({
      [COIN_INDEX_MICRO_KEY]: "1000000",
      [COIN_INDEX_CAP_BPS_KEY]: "500",
      [COIN_INDEX_UPDATED_AT_KEY]: "2026-11-05T00:00:00.000Z",
    })
    // Reader excludes products with no previous row; simulate that by returning none.
    const history = createFakeHistory({ changes: [], latest: "2026-11-06T00:00:00.000Z" })

    await createCoinIndexer({ history, settings })()

    expect(await readCoinIndex(settings)).toMatchObject({
      indexMicro: 1_000_000,
      updatedAt: "2026-11-06T00:00:00.000Z",
      lastRun: { meanRatioBps: 10_000, capped: false, products: 0 },
    })
    expect(await settings.get(COIN_INDEX_LAST_RUN_KEY)).toContain('"products":0')
  })

  test("returns state unchanged when latest cost timestamp is null", async () => {
    const settings = createInMemorySettings({
      [COIN_INDEX_MICRO_KEY]: "1000000",
      [COIN_INDEX_UPDATED_AT_KEY]: "2026-11-05T00:00:00.000Z",
    })
    const history = createFakeHistory({ changes: [], latest: null })

    const result = await createCoinIndexer({ history, settings })()

    expect(result).toMatchObject({ indexMicro: 1_000_000, updatedAt: "2026-11-05T00:00:00.000Z" })
    expect(await settings.get(COIN_INDEX_UPDATED_AT_KEY)).toBe("2026-11-05T00:00:00.000Z")
  })
})
