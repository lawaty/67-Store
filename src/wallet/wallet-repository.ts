/**
 * Declares wallet persistence capabilities: create/read balances, credit/debit
 * coins with reasons, and list ledger entries for a client.
 */
export type Wallet = { readonly clientId: string; readonly coinBalance: number }
export type WalletEntry = { readonly id: string; readonly amount: number; readonly reason: string; readonly reference: string | null; readonly createdAt: string }

export interface WalletRepository {
  getOrCreate(clientId: string): Promise<Wallet>
  credit(clientId: string, amount: number, reason: string, reference?: string): Promise<Wallet>
  debit(clientId: string, amount: number, reason: string, reference?: string): Promise<boolean>
  findEntryByReference(reference: string): Promise<WalletEntry | null>
  reverseDebit(reference: string): Promise<void>
  listEntries(clientId: string, limit: number): Promise<WalletEntry[]>
}
