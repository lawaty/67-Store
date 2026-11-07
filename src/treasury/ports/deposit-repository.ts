/**
 * Declares deposit persistence with append, client/recent/since history
 * listings, and the coin WAC in EGP minor units.
 */
import { Deposit } from "../domain/deposit"

export interface DepositRepository {
  append(deposit: Deposit): Promise<void>
  list(): Promise<Deposit[]>
  listByClient(clientId: string, limit: number): Promise<Deposit[]>
  listRecent(limit: number): Promise<Deposit[]>
  listSince(since: string): Promise<Deposit[]>
  coinWacEgpMinor(): Promise<number>
}
