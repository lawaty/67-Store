/**
 * Wallet funding value object: validates the quote stored when a wallet
 * funding starts, so settlement can later issue exactly the quoted coins.
 */
export const FUNDING_PROVIDERS = ["INSTAPAY", "CRYPTO"] as const
export type FundingProvider = (typeof FUNDING_PROVIDERS)[number]
export type WalletFundingStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED"
export type WalletFunding = {
  readonly id: string
  readonly clientId: string
  readonly currency: string
  readonly amountMinor: number
  readonly rateMinor: number
  readonly coins: number
  readonly wacEgpMinor: number
  readonly egpValueMinor: number
  readonly provider: FundingProvider
  readonly providerReference: string
  readonly status: WalletFundingStatus
  readonly depositId: string | null
  readonly createdAt: string
  readonly paidAt: string | null
}

const FUNDING_STATUSES: readonly WalletFundingStatus[] = ["PENDING", "PAID", "FAILED", "EXPIRED"]

function isParseableDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value))
}

export function walletFunding(input: WalletFunding): WalletFunding {
  if (typeof input !== "object" || input === null) {
    throw new RangeError()
  }
  if (
    typeof input.id !== "string" ||
    typeof input.clientId !== "string" ||
    typeof input.currency !== "string" ||
    typeof input.providerReference !== "string" ||
    typeof input.createdAt !== "string"
  ) {
    throw new RangeError()
  }
  if (
    input.id.trim().length === 0 ||
    input.clientId.trim().length === 0 ||
    input.currency.trim().length === 0 ||
    input.providerReference.trim().length === 0
  ) {
    throw new RangeError()
  }

  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(input.rateMinor) || input.rateMinor <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(input.coins) || input.coins <= 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(input.wacEgpMinor) || input.wacEgpMinor < 0) {
    throw new RangeError()
  }
  if (!Number.isSafeInteger(input.egpValueMinor) || input.egpValueMinor < 0) {
    throw new RangeError()
  }

  if (!(FUNDING_PROVIDERS as readonly string[]).includes(input.provider)) {
    throw new RangeError()
  }
  if (!(FUNDING_STATUSES as readonly string[]).includes(input.status)) {
    throw new RangeError()
  }

  if (input.depositId !== null) {
    if (typeof input.depositId !== "string" || input.depositId.trim().length === 0) {
      throw new RangeError()
    }
  }

  if (!isParseableDate(input.createdAt)) {
    throw new RangeError()
  }

  if (input.paidAt !== null) {
    if (typeof input.paidAt !== "string" || !isParseableDate(input.paidAt)) {
      throw new RangeError()
    }
  }

  if (input.status === "PAID" && input.paidAt === null) {
    throw new RangeError()
  }

  return input
}
