/**
 * Reconciles the distributor's USDT balance against treasury records within a
 * configured tolerance on each run.
 */
import { TreasuryService } from "@/treasury"
import { Distributor } from "@/fulfilment"
import { ReconciliationRecord } from "@/treasury"

export function createReconcileTreasury(deps: {
  treasury: Pick<TreasuryService, "reconcile">
  distributor: Pick<Distributor, "getBalance">
  toleranceUsdtMinor: number
}): () => Promise<ReconciliationRecord> {
  return async () => {
    const { balanceMinor } = await deps.distributor.getBalance()
    return deps.treasury.reconcile({
      supplierUsdtMinor: balanceMinor,
      toleranceUsdtMinor: deps.toleranceUsdtMinor,
    })
  }
}
