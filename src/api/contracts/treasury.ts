/**
 * Defines the treasury dashboard read-model boundary shape returned to back-office clients.
 * Money-related values are carried as integer minor units per currency, except treasury USDT
 * quantities which are milli-USDT (1 USDT = 1000).
 */
export type TreasuryConsumptionDto = {
  readonly id: string
  readonly orderId: string
  readonly usdtMilli: number
  readonly basisEgpMinor: number
  readonly wacEgpMinor: number
  readonly createdAt: string
}
export type TreasuryDashboardDto = {
  readonly balance: { readonly usdMilli: number; readonly egpMinor: number } | null
  readonly balanceAt: string | null
  readonly balanceError: boolean
  readonly p2pEgpPerUsdtMinor: number | null
  readonly p2pMaxEgpPerUsdtMinor: number | null
  readonly recordedUsdtMilli: number
  readonly recordedBasisEgpMinor: number
  readonly wacEgpMinor: number
  readonly freeUsdtMilli: number
  readonly availableUsdtMilli: number
  readonly depositRates: readonly { readonly currency: string; readonly rateMinor: number }[]
  readonly reconciliation: { readonly status: string; readonly gapUsdtMilli: number; readonly createdAt: string } | null
  readonly fundings: readonly { readonly id: string; readonly egpPaidMinor: number; readonly usdtMilli: number; readonly createdAt: string }[]
  readonly deposits: readonly { readonly id: string; readonly clientId: string; readonly currency: string; readonly amountMinor: number; readonly rateMinor: number; readonly coins: number; readonly wacEgpMinor: number; readonly egpValueMinor: number; readonly createdAt: string }[]
  readonly consumptions: readonly TreasuryConsumptionDto[]
}
