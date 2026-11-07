/**
 * Computes and persists the coin index from product cost history after each
 * catalogue sync. Chained from the last indexed timestamp; no Prisma imports.
 */
import type { SettingsRepository } from "@/shared/settings-repository"
import type { CostHistoryReader } from "@/catalogue"
import { coinValueMinor, nextCoinIndex } from "@/treasury/domain/coin-index"
import { readCoinIndex, writeCoinIndexRun, type CoinIndexState } from "./coin-index-settings"

export function createCoinIndexer(deps: {
  history: CostHistoryReader
  settings: SettingsRepository
}): () => Promise<CoinIndexState> {
  return async () => {
    const state = await readCoinIndex(deps.settings)
    const changes = await deps.history.listCostChangesSince(state.updatedAt)
    const move = nextCoinIndex(state.indexMicro, changes, state.capBps)
    const latest = await deps.history.latestCostRecordedAt()
    if (latest === null) {
      return state
    }

    await writeCoinIndexRun(deps.settings, {
      indexMicro: move.indexMicro,
      capBps: state.capBps,
      updatedAt: latest,
      lastRun: {
        fromIndexMicro: move.fromIndexMicro,
        toIndexMicro: move.indexMicro,
        meanRatioBps: move.meanRatioBps,
        capped: move.capped,
        products: changes.length,
        at: latest,
      },
    })

    return {
      indexMicro: move.indexMicro,
      coinValueMinor: coinValueMinor(move.indexMicro),
      capBps: state.capBps,
      updatedAt: latest,
      lastRun: {
        fromIndexMicro: move.fromIndexMicro,
        toIndexMicro: move.indexMicro,
        meanRatioBps: move.meanRatioBps,
        capped: move.capped,
        products: changes.length,
        at: latest,
      },
    }
  }
}
