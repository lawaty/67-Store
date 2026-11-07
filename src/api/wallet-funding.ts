/**
 * Serves customer-facing wallet funding: quotes the cash→coins pricing for a
 * funding amount and starts a wallet funding for the authenticated client,
 * without mutating the wallet on the quote path.
 */

import type { Container } from "@/container"
import type { CurrencyCode } from "@/shared/money"

export type WalletFundingQuoteDto = {
  readonly currency: CurrencyCode
  readonly amountMinor: number
  readonly rateMinor: number
  readonly coins: number
  readonly egpValueMinor: number
}

function isFundingCurrency(value: unknown): value is CurrencyCode {
  return value === "EGP" || value === "USD"
}

function isValidAmountMinor(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
}

export async function quoteWalletFunding(
  c: Container,
  input: { readonly currency: unknown; readonly amountMinor: unknown },
): Promise<{ readonly ok: true; readonly quote: WalletFundingQuoteDto } | { readonly ok: false; readonly error: string }> {
  if (!isFundingCurrency(input.currency) || !isValidAmountMinor(input.amountMinor)) {
    return { ok: false, error: "amount" }
  }

  const result = await c.quoteDeposit({ currency: input.currency, amountMinor: input.amountMinor })
  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  return {
    ok: true,
    quote: {
      currency: result.quote.currency,
      amountMinor: result.quote.amountMinor,
      rateMinor: result.quote.rateMinor,
      coins: result.quote.coins,
      egpValueMinor: result.quote.egpValueMinor,
    },
  }
}

export async function startWalletFunding(
  c: Container,
  input: { readonly clientId: string; readonly currency: unknown; readonly amountMinor: unknown },
): Promise<{ readonly ok: true; readonly redirectUrl: string } | { readonly ok: false; readonly error: string }> {
  if (input.clientId.trim() === "" || !isFundingCurrency(input.currency) || !isValidAmountMinor(input.amountMinor)) {
    return { ok: false, error: "amount" }
  }

  const result = await c.startWalletFunding({ clientId: input.clientId, currency: input.currency, amountMinor: input.amountMinor })
  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  return { ok: true, redirectUrl: result.redirectUrl }
}
