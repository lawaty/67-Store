/**
 * Reconciles expected and supplier USDT within a tolerance, classifying the
 * gap as OK, GAP, or UNRECORDED_FUNDING.
 */
export type ReconciliationStatus = "OK" | "GAP" | "UNRECORDED_FUNDING"

export type Reconciliation = {
  readonly expectedUsdtMinor: number
  readonly supplierUsdtMinor: number
  readonly gapUsdtMinor: number
  readonly status: ReconciliationStatus
}

export function reconcile(input: {
  expectedUsdtMinor: number
  supplierUsdtMinor: number
  toleranceUsdtMinor: number
}): Reconciliation {
  const { expectedUsdtMinor, supplierUsdtMinor, toleranceUsdtMinor } = input

  if (
    !Number.isSafeInteger(expectedUsdtMinor) ||
    expectedUsdtMinor < 0 ||
    !Number.isSafeInteger(supplierUsdtMinor) ||
    supplierUsdtMinor < 0 ||
    !Number.isSafeInteger(toleranceUsdtMinor) ||
    toleranceUsdtMinor < 0
  ) {
    throw new RangeError()
  }

  const gap = supplierUsdtMinor - expectedUsdtMinor
  if (!Number.isSafeInteger(gap)) {
    throw new RangeError()
  }

  let status: ReconciliationStatus
  if (Math.abs(gap) <= toleranceUsdtMinor) {
    status = "OK"
  } else if (gap > toleranceUsdtMinor) {
    status = "UNRECORDED_FUNDING"
  } else {
    status = "GAP"
  }

  return Object.freeze({
    expectedUsdtMinor,
    supplierUsdtMinor,
    gapUsdtMinor: gap,
    status,
  })
}
