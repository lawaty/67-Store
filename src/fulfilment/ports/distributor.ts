/**
 * Anti-corruption boundary to the external reseller, defining the distributor
 * contract and status/error types used by fulfilment.
 */
export type DistributorStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export type PlayerCheck = { readonly valid: boolean; readonly name: string | null }

export type DistributorOrder = {
  readonly distributorOrderId: string
  readonly status: DistributorStatus
}

import { Player } from "@/ordering"
import { Product } from "@/catalogue"

export interface Distributor {
  checkPlayer(input: { game: string; player: Player }): Promise<PlayerCheck>
  placeOrder(input: { orderId: string; game: string; product: Product; player: Player }): Promise<DistributorOrder>
  getOrder(input: { distributorOrderId: string; game: string }): Promise<DistributorOrder>
  getBalance(): Promise<{ readonly balanceMinor: number }>
}

export class DistributorError extends Error {
  readonly status: number
  constructor(status: number, message: string) { super(message); this.name = "DistributorError"; this.status = status }
}
