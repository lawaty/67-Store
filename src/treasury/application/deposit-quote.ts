/**
 * Quotes the cash→coins pricing for a deposit: validates amount, resolves the
 * rate, and checks coin coverage, without recording anything.
 */
import { CurrencyCode, isCurrencyCode } from "../../shared/money"
import { USDT_MILLI_PER_USDT } from "../../shared/usdt"
import { Deposit, deposit, coinsForDeposit } from "../domain/deposit"
import { TreasuryService } from "./service"
import type { CoinSupplyRepository } from "@/wallet"
import { SettingsRepository } from "@/shared/settings-repository"
import { readDepositRate } from "@/treasury/application/deposit-settings"
import { readEgpRate } from "@/treasury/application/exchange-rate"
import { availableUsdtMilli } from "../domain/wac"
import { reservedUsdtMilli } from "../domain/coin-index"

export type DepositQuote = {
  readonly currency: CurrencyCode
  readonly amountMinor: number
  readonly rateMinor: number
  readonly coins: number
  readonly wacEgpMinor: number
  readonly egpValueMinor: number
  readonly coinValueMinor: number
}

export type DepositQuoteFields = Pick<DepositQuote, "currency" | "amountMinor" | "rateMinor" | "coins" | "wacEgpMinor" | "egpValueMinor">

export type QuoteDepositOutcome =
  | { readonly ok: true; readonly quote: DepositQuote }
  | { readonly ok: false; readonly error: "amount" | "rate" | "coverage" | "balance" }

export function createQuoteDeposit(deps: {
  treasury: Pick<TreasuryService, "snapshot">
  coinSupply: CoinSupplyRepository
  recordedUsdt: () => Promise<number>
  settings: SettingsRepository
  coinValueMinor: () => Promise<number>
}): (input: { readonly currency: CurrencyCode; readonly amountMinor: number }) => Promise<QuoteDepositOutcome> {
  return async (input: {
    readonly currency: CurrencyCode
    readonly amountMinor: number
  }): Promise<QuoteDepositOutcome> => {
    if (
      !isCurrencyCode(input.currency) ||
      !Number.isSafeInteger(input.amountMinor) ||
      input.amountMinor <= 0
    ) {
      return { ok: false, error: "amount" }
    }

    const snapshot = await deps.treasury.snapshot()

    let coinValueMinor: number
    try {
      coinValueMinor = await deps.coinValueMinor()
    } catch (error) {
      if (error instanceof RangeError) {
        return { ok: false, error: "rate" }
      }
      throw error
    }

    let rate: number
    try {
      rate = await readDepositRate(deps.settings, input.currency, snapshot.wacEgpMinor, coinValueMinor)
    } catch (error) {
      if (error instanceof RangeError) {
        return { ok: false, error: "rate" }
      }
      throw error
    }

    let coins: number
    try {
      coins = coinsForDeposit(input.amountMinor, rate)
    } catch (error) {
      if (error instanceof RangeError) {
        return { ok: false, error: "amount" }
      }
      throw error
    }
    if (coins === 0) {
      return { ok: false, error: "amount" }
    }

    let recordedUsdt: number
    try {
      recordedUsdt = await deps.recordedUsdt()
    } catch {
      return { ok: false, error: "balance" }
    }

    let outstanding: number
    try {
      outstanding = await deps.coinSupply.totalCoins()
    } catch {
      return { ok: false, error: "balance" }
    }

    if (
      reservedUsdtMilli(coins, coinValueMinor) >
      availableUsdtMilli(recordedUsdt, reservedUsdtMilli(outstanding, coinValueMinor))
    ) {
      return { ok: false, error: "coverage" }
    }

    let egpValueMinor: number
    if (input.currency === "EGP") {
      egpValueMinor = input.amountMinor
    } else {
      egpValueMinor = Math.round(
        (reservedUsdtMilli(coins, coinValueMinor) * Math.round((await readEgpRate(deps.settings)) * 100)) / USDT_MILLI_PER_USDT,
      )
    }

    const quote: DepositQuote = {
      currency: input.currency,
      amountMinor: input.amountMinor,
      rateMinor: rate,
      coins,
      wacEgpMinor: snapshot.wacEgpMinor,
      egpValueMinor,
      coinValueMinor,
    }
    return { ok: true, quote }
  }
}

export function depositFromQuote(input: {
  readonly id: string
  readonly clientId: string
  readonly createdAt: string
  readonly quote: DepositQuoteFields
}): Deposit {
  return deposit({
    id: input.id,
    clientId: input.clientId,
    currency: input.quote.currency,
    amountMinor: input.quote.amountMinor,
    rateMinor: input.quote.rateMinor,
    coins: input.quote.coins,
    wacEgpMinor: input.quote.wacEgpMinor,
    egpValueMinor: input.quote.egpValueMinor,
    createdAt: input.createdAt,
  })
}
