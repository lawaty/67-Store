/**
 * Defines the treasury dashboard read-model boundary shape returned to back-office clients.
 * Money-related values are carried as integer minor units per currency.
 */
export type TreasuryConsumptionDto = {
  readonly id: string
  readonly orderId: string
  readonly usdtMinor: number
  readonly basisEgpMinor: number
  readonly wacEgpMinor: number
  readonly createdAt: string
}
export type TreasuryDashboardDto = {
  readonly balance: { readonly usdMinor: number; readonly egpMinor: number } | null
  readonly balanceAt: string | null
  readonly balanceError: boolean
  readonly p2pEgpPerUsdtMinor: number | null
  readonly p2pMaxEgpPerUsdtMinor: number | null
  readonly recordedUsdtMinor: number
  readonly recordedBasisEgpMinor: number
  readonly wacEgpMinor: number
  readonly freeUsdtMinor: number
  readonly availableUsdtMinor: number
  readonly depositRates: readonly { readonly currency: string; readonly rateMinor: number }[]
  readonly reconciliation: { readonly status: string; readonly gapUsdtMinor: number; readonly createdAt: string } | null
  readonly fundings: readonly { readonly id: string; readonly egpPaidMinor: number; readonly usdtMinor: number; readonly createdAt: string }[]
  readonly deposits: readonly { readonly id: string; readonly clientId: string; readonly currency: string; readonly amountMinor: number; readonly rateMinor: number; readonly coins: number; readonly wacEgpMinor: number; readonly egpValueMinor: number; readonly createdAt: string }[]
  readonly consumptions: readonly TreasuryConsumptionDto[]
}
