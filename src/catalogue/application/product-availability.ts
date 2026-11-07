/**
 * Computes admin product buyability from available treasury USDT and product state.
 * Uses available funds only; pending funding is excluded by the snapshot source.
 */
export type ProductAvailabilityInput = {
  readonly active: boolean
  readonly costMinor: number
  readonly availableUsdtMinor: number | null
}

export type ProductAvailability = {
  readonly buyable: boolean
  readonly fundingGapMinor: number
  readonly unavailableReason: "inactive" | "insufficient_funds" | "unknown_balance" | null
}

export function productAvailability(input: ProductAvailabilityInput): ProductAvailability {
  if (!input.active) {
    return { buyable: false, fundingGapMinor: 0, unavailableReason: "inactive" }
  }
  if (input.availableUsdtMinor === null) {
    return { buyable: false, fundingGapMinor: 0, unavailableReason: "unknown_balance" }
  }
  if (input.costMinor <= input.availableUsdtMinor) {
    return { buyable: true, fundingGapMinor: 0, unavailableReason: null }
  }
  return {
    buyable: false,
    fundingGapMinor: input.costMinor - input.availableUsdtMinor,
    unavailableReason: "insufficient_funds",
  }
}
