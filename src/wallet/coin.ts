/**
 * Coin value object utilities: validates positive coin amounts.
 */
import { brand } from "@/shared/brand"

export const COIN_NAME = brand.coin

export function assertPositiveCoins(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new RangeError("Coin amount must be a positive integer")
  }
}
