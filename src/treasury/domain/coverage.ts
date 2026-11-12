/**
 * Computes treasury coverage in basis points from balance versus outstanding
 * coins, returning 10000 when none are outstanding and rounding half-up.
 */
export function coverageBasisPoints(balanceUsdtMilli: number, coinsOutstandingUsdtMilli: number): number {
  if (!Number.isSafeInteger(balanceUsdtMilli) || balanceUsdtMilli < 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(coinsOutstandingUsdtMilli) || coinsOutstandingUsdtMilli < 0) {
    throw new RangeError()
  }
  if (coinsOutstandingUsdtMilli === 0) {
    return 10000
  }
  const numerator = balanceUsdtMilli * 10000
  if (!Number.isSafeInteger(numerator)) {
    throw new RangeError()
  }
  const result = Math.floor((numerator + coinsOutstandingUsdtMilli / 2) / coinsOutstandingUsdtMilli)
  if (!Number.isSafeInteger(result)) {
    throw new RangeError()
  }
  return result
}
