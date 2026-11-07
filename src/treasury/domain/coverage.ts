/**
 * Computes treasury coverage in basis points from balance versus outstanding
 * coins, returning 10000 when none are outstanding and rounding half-up.
 */
export function coverageBasisPoints(balanceUsdtMinor: number, coinsOutstandingUsdtMinor: number): number {
  if (!Number.isSafeInteger(balanceUsdtMinor) || balanceUsdtMinor < 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(coinsOutstandingUsdtMinor) || coinsOutstandingUsdtMinor < 0) {
    throw new RangeError()
  }
  if (coinsOutstandingUsdtMinor === 0) {
    return 10000
  }
  const numerator = balanceUsdtMinor * 10000
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  const result = Math.floor((numerator + coinsOutstandingUsdtMinor / 2) / coinsOutstandingUsdtMinor)
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}
