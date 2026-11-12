/**
 * Declares the persistence capability for orders: save, load, query, and
 * aggregate reads needed by ordering use cases.
 */
import { Order } from "../domain/order"
import { OrderStatus } from "../domain/order-status"

export interface OrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | null>
  findByToken(token: string): Promise<Order | null>
  update(order: Order): Promise<void>
  listRecent(limit: number): Promise<Order[]>
  listByClient(clientId: string, limit: number): Promise<Order[]>
  countByClient(clientId: string, since: string | null): Promise<number>
  findByDistributorOrderId(distributorOrderId: string): Promise<Order | null>
  listByStatus(status: OrderStatus, limit: number, skip?: number): Promise<Order[]>
  listFailedUnrefundedCoinOrders(limit: number): Promise<Order[]>
  search(input: { status: OrderStatus | null; from: string | null; to: string | null; q: string | null; skip: number; take: number }): Promise<{ rows: Order[]; total: number }>
  sumCoinsChargedSince(since: string): Promise<number>
  summarizeByClient(
    clientId: string,
    monthStart: string,
  ): Promise<{ totalOrders: number; totalPaidCoins: number; monthlyPaidCoins: number }>
}

