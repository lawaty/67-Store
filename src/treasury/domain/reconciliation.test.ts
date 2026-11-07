import { describe, expect, it } from "vitest"
import { reconcile } from "./reconciliation"

describe("reconcile", () => {
  it("OK when within tolerance", () => {
    const r = reconcile({ expectedUsdtMinor: 100, supplierUsdtMinor: 105, toleranceUsdtMinor: 5 })
    expect(r.status).toBe("OK")
    expect(r.gapUsdtMinor).toBe(5)
  })

  it("UNRECORDED_FUNDING when gap > tolerance", () => {
    const r = reconcile({ expectedUsdtMinor: 100, supplierUsdtMinor: 200, toleranceUsdtMinor: 5 })
    expect(r.status).toBe("UNRECORDED_FUNDING")
    expect(r.gapUsdtMinor).toBe(100)
  })

  it("GAP when gap < -tolerance", () => {
    const r = reconcile({ expectedUsdtMinor: 100, supplierUsdtMinor: 50, toleranceUsdtMinor: 5 })
    expect(r.status).toBe("GAP")
    expect(r.gapUsdtMinor).toBe(-50)
  })

  it("exact tolerance boundary is OK", () => {
    expect(reconcile({ expectedUsdtMinor: 100, supplierUsdtMinor: 105, toleranceUsdtMinor: 5 }).status).toBe("OK")
    expect(reconcile({ expectedUsdtMinor: 100, supplierUsdtMinor: 95, toleranceUsdtMinor: 5 }).status).toBe("OK")
  })

  it("just beyond tolerance", () => {
    expect(reconcile({ expectedUsdtMinor: 100, supplierUsdtMinor: 106, toleranceUsdtMinor: 5 }).status).toBe("UNRECORDED_FUNDING")
    expect(reconcile({ expectedUsdtMinor: 100, supplierUsdtMinor: 94, toleranceUsdtMinor: 5 }).status).toBe("GAP")
  })

  it("throws RangeError on bad input", () => {
    expect(() => reconcile({ expectedUsdtMinor: -1, supplierUsdtMinor: 0, toleranceUsdtMinor: 0 })).toThrow(RangeError)
    expect(() => reconcile({ expectedUsdtMinor: 0, supplierUsdtMinor: 0, toleranceUsdtMinor: -1 })).toThrow(RangeError)
    expect(() => reconcile({ expectedUsdtMinor: 1.5, supplierUsdtMinor: 0, toleranceUsdtMinor: 0 })).toThrow(RangeError)
  })

  it("returns frozen", () => {
    const r = reconcile({ expectedUsdtMinor: 0, supplierUsdtMinor: 0, toleranceUsdtMinor: 0 })
    expect(Object.isFrozen(r)).toBe(true)
  })
})
