/**
 * Reads the available USDT (recorded treasury funds minus coins
 * outstanding), in milli-USDT — the single composed home for that fact.
 */
import { availableUsdtMilli } from "../domain/wac"
import { reservedUsdtMilli } from "../domain/coin-index"

export type AvailableUsdtDeps = {
  readonly recordedUsdt: () => Promise<number>
  readonly coinsOutstanding: () => Promise<number>
  readonly coinValueMinor: () => Promise<number>
}

export async function readAvailableUsdtMilli(deps: AvailableUsdtDeps): Promise<number> {
  const [recorded, coins, coinValueMinor] = await Promise.all([
    deps.recordedUsdt(),
    deps.coinsOutstanding(),
    deps.coinValueMinor(),
  ])
  return availableUsdtMilli(recorded, reservedUsdtMilli(coins, coinValueMinor))
}
