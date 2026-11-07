import { describe, expect, it, vi } from "vitest"
import { createReconcileTreasury } from "./reconcile"
import { TreasuryService } from "@/treasury"
import { Distributor } from "@/fulfilment"
import { ReconciliationRecord } from "@/treasury"

describe("createReconcileTreasury", () => {
  it("uses getBalance, calls reconcile with live balance and tolerance, returns record", async () => {
    const record = {
      id: "r1",
      expectedUsdtMinor: 1000,
      supplierUsdtMinor: 1050,
      gapUsdtMinor: 50,
      status: "OK",
      createdAt: "now",
    } as ReconciliationRecord

    const getBalance = vi.fn().mockResolvedValue({ balanceMinor: 1050 })
    const reconcile = vi.fn().mockResolvedValue(record)

    const treasury = { reconcile } as Pick<TreasuryService, "reconcile">
    const distributor = { getBalance } as Pick<Distributor, "getBalance">

    const run = createReconcileTreasury({ treasury, distributor, toleranceUsdtMinor: 100 })
    const result = await run()

    expect(getBalance).toHaveBeenCalled()
    expect(reconcile).toHaveBeenCalledWith({ supplierUsdtMinor: 1050, toleranceUsdtMinor: 100 })
    expect(result).toBe(record)
  })
})
