/**
 * Reads the available USDT (recorded treasury funds minus coins
 * outstanding), in USDT minor units — the single composed home for that fact.
 */
import { availableUsdtMinor } from "../domain/wac"
import { reservedUsdtMinor } from "../domain/coin-index"

export type AvailableUsdtDeps = {
  readonly recordedUsdt: () => Promise<number>
  readonly coinsOutstanding: () => Promise<number>
  readonly coinValueMinor: () => Promise<number>
}

export async function readAvailableUsdtMinor(deps: AvailableUsdtDeps): Promise<number> {
  const [recorded, coins, coinValueMinor] = await Promise.all([
    deps.recordedUsdt(),
    deps.coinsOutstanding(),
    deps.coinValueMinor(),
  ])
  return availableUsdtMinor(recorded, reservedUsdtMinor(coins, coinValueMinor))
}
