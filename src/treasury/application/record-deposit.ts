/**
 * Coordinates recording a client deposit: validates amount, resolves the rate,
 * checks coin coverage, appends the deposit, and credits the wallet.
 */
import { CurrencyCode } from "../../shared/money"
import { Deposit } from "../domain/deposit"
import { DepositRepository } from "../ports/deposit-repository"
import { TreasuryService } from "./service"
import { Wallet, WalletRepository } from "@/wallet"
import { CoinSupplyRepository } from "@/wallet"
import { SettingsRepository } from "@/shared/settings-repository"
import { createQuoteDeposit, depositFromQuote } from "./deposit-quote"

export type RecordDepositInput = {
  readonly clientId: string
  readonly currency: CurrencyCode
  readonly amountMinor: number
}

export type RecordDepositOutcome =
  | { readonly ok: true; readonly deposit: Deposit; readonly wallet: Wallet }
  | { readonly ok: false; readonly error: "amount" | "rate" | "coverage" | "balance" }

export function createRecordDeposit(deps: {
  deposits: DepositRepository
  treasury: Pick<TreasuryService, "snapshot">
  wallets: Pick<WalletRepository, "credit">
  coinSupply: CoinSupplyRepository
  recordedUsdt: () => Promise<number>
  settings: SettingsRepository
  coinValueMinor: () => Promise<number>
  newId: () => string
  now: () => string
}): (input: RecordDepositInput) => Promise<RecordDepositOutcome> {
  const quote = createQuoteDeposit({
    treasury: deps.treasury,
    coinSupply: deps.coinSupply,
    recordedUsdt: deps.recordedUsdt,
    settings: deps.settings,
    coinValueMinor: deps.coinValueMinor,
  })

  return async (input: RecordDepositInput): Promise<RecordDepositOutcome> => {
    if (typeof input.clientId !== "string" || input.clientId.trim() === "") {
      return { ok: false, error: "amount" }
    }

    const quoted = await quote({ currency: input.currency, amountMinor: input.amountMinor })
    if (!quoted.ok) {
      return quoted
    }

    const d = depositFromQuote({
      id: deps.newId(),
      clientId: input.clientId,
      createdAt: deps.now(),
      quote: quoted.quote,
    })

    await deps.deposits.append(d)
    const wallet = await deps.wallets.credit(input.clientId, d.coins, "deposit:" + d.id)
    return { ok: true, deposit: d, wallet }
  }
}
