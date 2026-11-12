/**
 * Reconciles expected and supplier USDT (milli-USDT) within a tolerance, classifying the
 * gap as OK, GAP, or UNRECORDED_FUNDING.
 */
export type ReconciliationStatus = "OK" | "GAP" | "UNRECORDED_FUNDING"

export type Reconciliation = {
  readonly expectedUsdtMilli: number
  readonly supplierUsdtMilli: number
  readonly gapUsdtMilli: number
  readonly status: ReconciliationStatus
}

export function reconcile(input: {
  expectedUsdtMilli: number
  supplierUsdtMilli: number
  toleranceUsdtMilli: number
}): Reconciliation {
  const { expectedUsdtMilli, supplierUsdtMilli, toleranceUsdtMilli } = input

  if (
    !Number.isSafeInteger(expectedUsdtMilli) ||
    expectedUsdtMilli < 0 ||
    !Number.isSafeInteger(supplierUsdtMilli) ||
    supplierUsdtMilli < 0 ||
    !Number.isSafeInteger(toleranceUsdtMilli) ||
    toleranceUsdtMilli < 0
  ) {
    throw new RangeError()
  }

  const gap = supplierUsdtMilli - expectedUsdtMilli
  if (!Number.isSafeInteger(gap)) {
    throw new RangeError()
  }

  let status: ReconciliationStatus
  if (Math.abs(gap) <= toleranceUsdtMilli) {
    status = "OK"
  } else if (gap > toleranceUsdtMilli) {
    status = "UNRECORDED_FUNDING"
  } else {
    status = "GAP"
  }

  return Object.freeze({
    expectedUsdtMilli,
    supplierUsdtMilli,
    gapUsdtMilli: gap,
    status,
  })
}
