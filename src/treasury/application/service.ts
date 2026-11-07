/**
 * Coordinates treasury operations: snapshots, funding, order consumption, and
 * supplier reconciliation over funding/consumption/reconciliation stores.
 */
import { Funding, funding } from "../domain/funding"
import { ConsumptionRepository } from "../ports/consumption-repository"
import { FundingRepository } from "../ports/funding-repository"
import { ReconciliationRepository, ReconciliationRecord } from "../ports/reconciliation-repository"
import { TreasuryConsumption, treasuryConsumption } from "../domain/consumption"
import { reconcile as reconcilePure } from "../domain/reconciliation"
import { wacEgpMinor } from "../domain/wac"

export type TreasurySnapshot = {
  readonly usdtMinor: number
  readonly basisEgpMinor: number
  readonly wacEgpMinor: number
}

export type TreasuryService = {
  snapshot(): Promise<TreasurySnapshot>
  recordFunding(input: Omit<Funding, "id" | "createdAt">): Promise<Funding>
  consumeForOrder(input: {
    orderId: string
    costUsdtMinor: number
    wacEgpMinor: number
    cogsEgpMinor: number
  }): Promise<TreasuryConsumption>
  reconcile(input: { supplierUsdtMinor: number; toleranceUsdtMinor: number }): Promise<ReconciliationRecord>
}

export function createTreasuryService(deps: {
  fundings: FundingRepository
  consumptions: ConsumptionRepository
  reconciliations: ReconciliationRepository
  newId: () => string
  now: () => string
}): TreasuryService {
  const computeSnapshot = async (): Promise<TreasurySnapshot> => {
    const [fundingTotals, consumptionTotals] = await Promise.all([
      deps.fundings.totals(),
      deps.consumptions.totals(),
    ])
    const usdt = fundingTotals.usdtMinor - consumptionTotals.usdtMinor
    const basis = fundingTotals.basisEgpMinor - consumptionTotals.basisEgpMinor
    if (usdt < 0 || basis < 0) {
      throw new RangeError()
    }
    const wac = wacEgpMinor({ usdtMinor: usdt, basisEgpMinor: basis })
    return Object.freeze({ usdtMinor: usdt, basisEgpMinor: basis, wacEgpMinor: wac })
  }

  return {
    snapshot: computeSnapshot,
    recordFunding: async (input: Omit<Funding, "id" | "createdAt">): Promise<Funding> => {
      const lot = funding({ ...input, id: deps.newId(), createdAt: deps.now() })
      await deps.fundings.append(lot)
      return lot
    },
    consumeForOrder: async (input: {
      orderId: string
      costUsdtMinor: number
      wacEgpMinor: number
      cogsEgpMinor: number
    }): Promise<TreasuryConsumption> => {
      const existing = await deps.consumptions.findByOrder(input.orderId)
      if (existing !== null) {
        return existing
      }
      const snap = await computeSnapshot()
      if (input.costUsdtMinor > snap.usdtMinor) {
        throw new RangeError("Insufficient treasury")
      }
      const cons = treasuryConsumption({
        id: deps.newId(),
        orderId: input.orderId,
        usdtMinor: input.costUsdtMinor,
        basisEgpMinor: input.cogsEgpMinor,
        wacEgpMinor: input.wacEgpMinor,
        createdAt: deps.now(),
      })
      await deps.consumptions.append(cons)
      return cons
    },
    reconcile: async (input: { supplierUsdtMinor: number; toleranceUsdtMinor: number }): Promise<ReconciliationRecord> => {
      const snap = await computeSnapshot()
      const pure = reconcilePure({
        expectedUsdtMinor: snap.usdtMinor,
        supplierUsdtMinor: input.supplierUsdtMinor,
        toleranceUsdtMinor: input.toleranceUsdtMinor,
      })
      const record: ReconciliationRecord = Object.freeze({
        id: deps.newId(),
        expectedUsdtMinor: pure.expectedUsdtMinor,
        supplierUsdtMinor: pure.supplierUsdtMinor,
        gapUsdtMinor: pure.gapUsdtMinor,
        status: pure.status,
        createdAt: deps.now(),
      })
      await deps.reconciliations.append(record)
      return record
    },
  }
}
