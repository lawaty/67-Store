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
import { proRataBasisEgpMinor, wacEgpMinor } from "../domain/wac"

export type TreasurySnapshot = {
  readonly usdtMilli: number
  readonly basisEgpMinor: number
  readonly wacEgpMinor: number
}

export type TreasuryRepositories = {
  fundings: FundingRepository
  consumptions: ConsumptionRepository
  reconciliations: ReconciliationRepository
}

export type RunInTreasuryTransaction = <T>(
  fn: (repos: TreasuryRepositories) => Promise<T>,
) => Promise<T>

export type TreasuryService = {
  snapshot(): Promise<TreasurySnapshot>
  recordFunding(input: Omit<Funding, "id" | "createdAt">): Promise<Funding>
  consumeForOrder(input: { orderId: string; costUsdtMilli: number }): Promise<TreasuryConsumption>
  reconcile(input: { supplierUsdtMilli: number; toleranceUsdtMilli: number }): Promise<ReconciliationRecord>
}

export function createTreasuryService(
  deps: TreasuryRepositories & { newId: () => string; now: () => string; runInTransaction?: RunInTreasuryTransaction },
): TreasuryService {
  const defaultRepos: TreasuryRepositories = {
    fundings: deps.fundings,
    consumptions: deps.consumptions,
    reconciliations: deps.reconciliations,
  }
  const runInTransaction: RunInTreasuryTransaction =
    deps.runInTransaction ?? ((fn) => fn(defaultRepos))

  const computeSnapshot = async (repos: TreasuryRepositories = defaultRepos): Promise<TreasurySnapshot> => {
    const [fundingTotals, consumptionTotals] = await Promise.all([
      repos.fundings.totals(),
      repos.consumptions.totals(),
    ])
    const usdtMilli = fundingTotals.usdtMilli - consumptionTotals.usdtMilli
    if (usdtMilli < 0) {
      throw new RangeError()
    }
    if (usdtMilli === 0) {
      return Object.freeze({ usdtMilli: 0, basisEgpMinor: 0, wacEgpMinor: 0 })
    }
    // WAC is a function of the funding lots only; spending cannot move it.
    const wac = wacEgpMinor({
      usdtMilli: fundingTotals.usdtMilli,
      basisEgpMinor: fundingTotals.basisEgpMinor,
    })
    // Remaining EGP basis is the pro-rata share of the funding basis for the USDT still held.
    const basis = proRataBasisEgpMinor(usdtMilli, {
      usdtMilli: fundingTotals.usdtMilli,
      basisEgpMinor: fundingTotals.basisEgpMinor,
    })
    return Object.freeze({ usdtMilli, basisEgpMinor: basis, wacEgpMinor: wac })
  }

  return {
    snapshot: () => computeSnapshot(),
    recordFunding: async (input: Omit<Funding, "id" | "createdAt">): Promise<Funding> => {
      const lot = funding({ ...input, id: deps.newId(), createdAt: deps.now() })
      await defaultRepos.fundings.append(lot)
      return lot
    },
    consumeForOrder: async (input) =>
      runInTransaction(async (repos) => {
        const existing = await repos.consumptions.findByOrder(input.orderId)
        if (existing !== null) {
          return existing
        }
        const snap = await computeSnapshot(repos)
        if (input.costUsdtMilli > snap.usdtMilli) {
          throw new RangeError("Insufficient treasury")
        }
        const basisEgpMinor = proRataBasisEgpMinor(input.costUsdtMilli, snap)
        const consumption = treasuryConsumption({
          id: deps.newId(),
          orderId: input.orderId,
          usdtMilli: input.costUsdtMilli,
          basisEgpMinor,
          wacEgpMinor: snap.wacEgpMinor,
          createdAt: deps.now(),
        })
        await repos.consumptions.append(consumption)
        return consumption
      }),
    reconcile: async (input: { supplierUsdtMilli: number; toleranceUsdtMilli: number }): Promise<ReconciliationRecord> => {
      const snap = await computeSnapshot()
      const pure = reconcilePure({
        expectedUsdtMilli: snap.usdtMilli,
        supplierUsdtMilli: input.supplierUsdtMilli,
        toleranceUsdtMilli: input.toleranceUsdtMilli,
      })
      const record: ReconciliationRecord = Object.freeze({
        id: deps.newId(),
        expectedUsdtMilli: pure.expectedUsdtMilli,
        supplierUsdtMilli: pure.supplierUsdtMilli,
        gapUsdtMilli: pure.gapUsdtMilli,
        status: pure.status,
        createdAt: deps.now(),
      })
      await defaultRepos.reconciliations.append(record)
      return record
    },
  }
}
