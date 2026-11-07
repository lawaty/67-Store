/**
 * Coin value object utilities: validates positive coin amounts.
 */
export const COIN_NAME = "67 Coins"

export function assertPositiveCoins(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError("Coin amount must be a positive integer")
  }
}
