/**
 * Declares wallet funding persistence: creates a funding, looks it up by
 * provider reference, atomically marks it paid, and attaches its deposit.
 */
import { WalletFunding } from "../domain/wallet-funding"

export interface WalletFundingRepository {
  create(funding: WalletFunding): Promise<void>
  findByReference(providerReference: string): Promise<WalletFunding | null>
  markPaid(id: string, paidAt: string): Promise<boolean>
  attachDeposit(id: string, depositId: string): Promise<void>
}
