import { describe, expect, it } from "vitest"
import { reconcile } from "./reconciliation"

describe("reconcile", () => {
  it("OK when within tolerance", () => {
    const r = reconcile({ expectedUsdtMilli: 1000, supplierUsdtMilli: 1050, toleranceUsdtMilli: 50 })
    expect(r.status).toBe("OK")
    expect(r.gapUsdtMilli).toBe(50)
  })

  it("UNRECORDED_FUNDING when gap > tolerance", () => {
    const r = reconcile({ expectedUsdtMilli: 1000, supplierUsdtMilli: 2000, toleranceUsdtMilli: 50 })
    expect(r.status).toBe("UNRECORDED_FUNDING")
    expect(r.gapUsdtMilli).toBe(1000)
  })

  it("GAP when gap < -tolerance", () => {
    const r = reconcile({ expectedUsdtMilli: 1000, supplierUsdtMilli: 500, toleranceUsdtMilli: 50 })
    expect(r.status).toBe("GAP")
    expect(r.gapUsdtMilli).toBe(-500)
  })

  it("exact tolerance boundary is OK", () => {
    expect(reconcile({ expectedUsdtMilli: 1000, supplierUsdtMilli: 1050, toleranceUsdtMilli: 50 }).status).toBe("OK")
    expect(reconcile({ expectedUsdtMilli: 1000, supplierUsdtMilli: 950, toleranceUsdtMilli: 50 }).status).toBe("OK")
  })

  it("just beyond tolerance", () => {
    expect(reconcile({ expectedUsdtMilli: 1000, supplierUsdtMilli: 1060, toleranceUsdtMilli: 50 }).status).toBe("UNRECORDED_FUNDING")
    expect(reconcile({ expectedUsdtMilli: 1000, supplierUsdtMilli: 940, toleranceUsdtMilli: 50 }).status).toBe("GAP")
  })

  it("throws RangeError on bad input", () => {
    expect(() => reconcile({ expectedUsdtMilli: -10, supplierUsdtMilli: 0, toleranceUsdtMilli: 0 })).toThrow(RangeError)
    expect(() => reconcile({ expectedUsdtMilli: 0, supplierUsdtMilli: 0, toleranceUsdtMilli: -1 })).toThrow(RangeError)
    expect(() => reconcile({ expectedUsdtMilli: 1.5, supplierUsdtMilli: 0, toleranceUsdtMilli: 0 })).toThrow(RangeError)
  })

  it("returns frozen", () => {
    const r = reconcile({ expectedUsdtMilli: 0, supplierUsdtMilli: 0, toleranceUsdtMilli: 0 })
    expect(Object.isFrozen(r)).toBe(true)
  })
})
