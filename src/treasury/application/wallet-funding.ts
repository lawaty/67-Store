/**
 * Starts and settles wallet fundings: settlement is idempotent via the
 * conditional PENDING->PAID transition; the deposit is created from the
 * quote stored at start so the customer receives exactly the coins quoted.
 */
import { CurrencyCode } from "../../shared/money"
import { WalletFunding, walletFunding } from "../domain/wallet-funding"
import { WalletFundingRepository } from "../ports/wallet-funding-repository"
import { DepositRepository } from "../ports/deposit-repository"
import type { WalletRepository } from "@/wallet"
import { QuoteDepositOutcome, DepositQuoteFields, depositFromQuote } from "./deposit-quote"

export type StartWalletFundingOutcome =
  | { readonly ok: true; readonly funding: WalletFunding; readonly redirectUrl: string }
  | { readonly ok: false; readonly error: "amount" | "rate" | "coverage" | "balance" }

export function createStartWalletFunding(deps: {
  quote: (input: { readonly currency: CurrencyCode; readonly amountMinor: number }) => Promise<QuoteDepositOutcome>
  fundings: WalletFundingRepository
  newId: () => string
  now: () => string
}): (input: { readonly clientId: string; readonly currency: CurrencyCode; readonly amountMinor: number }) => Promise<StartWalletFundingOutcome> {
  return async (input: {
    readonly clientId: string
    readonly currency: CurrencyCode
    readonly amountMinor: number
  }): Promise<StartWalletFundingOutcome> => {
    if (typeof input.clientId !== "string" || input.clientId.trim() === "") {
      return { ok: false, error: "amount" }
    }

    const quoted = await deps.quote({ currency: input.currency, amountMinor: input.amountMinor })
    if (!quoted.ok) {
      return quoted
    }

    const provider = input.currency === "USD" ? "CRYPTO" : "INSTAPAY"
    const id = deps.newId()
    const providerReference = `fake_${provider.toLowerCase()}_fund_${id}`
    const funding = walletFunding({
      id,
      clientId: input.clientId,
      currency: quoted.quote.currency,
      amountMinor: quoted.quote.amountMinor,
      rateMinor: quoted.quote.rateMinor,
      coins: quoted.quote.coins,
      wacEgpMinor: quoted.quote.wacEgpMinor,
      egpValueMinor: quoted.quote.egpValueMinor,
      provider,
      providerReference,
      status: "PENDING",
      depositId: null,
      createdAt: deps.now(),
      paidAt: null,
    })
    await deps.fundings.create(funding)
    return { ok: true, funding, redirectUrl: `/checkout/fake/${providerReference}` }
  }
}

export type SettleWalletFundingOutcome =
  | { readonly ok: true; readonly funding: WalletFunding; readonly depositId: string | null; readonly alreadySettled: boolean }
  | { readonly ok: false; readonly error: "not_found" | "not_pending" }

export function createSettleWalletFunding(deps: {
  fundings: WalletFundingRepository
  deposits: Pick<DepositRepository, "append">
  wallets: Pick<WalletRepository, "credit">
  newId: () => string
  now: () => string
}): (input: { readonly providerReference: string }) => Promise<SettleWalletFundingOutcome> {
  return async (input: { readonly providerReference: string }): Promise<SettleWalletFundingOutcome> => {
    const funding = await deps.fundings.findByReference(input.providerReference)
    if (funding === null) {
      return { ok: false, error: "not_found" }
    }
    if (funding.status === "PAID") {
      return { ok: true, funding, depositId: funding.depositId, alreadySettled: true }
    }
    if (funding.status !== "PENDING") {
      return { ok: false, error: "not_pending" }
    }

    const now = deps.now()
    const locked = await deps.fundings.markPaid(funding.id, now)
    if (!locked) {
      const reread = await deps.fundings.findByReference(input.providerReference)
      if (reread !== null && reread.status === "PAID") {
        return { ok: true, funding: reread, depositId: reread.depositId, alreadySettled: true }
      }
      return { ok: false, error: "not_pending" }
    }

    const deposit = depositFromQuote({ id: deps.newId(), clientId: funding.clientId, createdAt: now, quote: funding as DepositQuoteFields })
    await deps.deposits.append(deposit)
    await deps.wallets.credit(funding.clientId, deposit.coins, "deposit:" + deposit.id)
    await deps.fundings.attachDeposit(funding.id, deposit.id)

    return {
      ok: true,
      funding: { ...funding, status: "PAID" as const, paidAt: now, depositId: deposit.id },
      depositId: deposit.id,
      alreadySettled: false,
    }
  }
}
