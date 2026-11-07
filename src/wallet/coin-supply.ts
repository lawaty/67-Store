/**
 * Declares the capability to compute the total spendable coin supply across
 * wallets.
 */
export interface CoinSupplyRepository {
  totalCoins(): Promise<number>
}
