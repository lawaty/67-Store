/**
 * Defines the Product domain value object and a factory that trims fields and
 * rejects empty identifiers, returning an immutable product snapshot.
 */
import { Money } from "../../shared/money"

export type Product = {
  readonly id: string
  readonly distributorId: string
  readonly name: string
  readonly cost: Money
  readonly game: string
  readonly active?: boolean
  readonly syncedAt?: Date
}

export function product(input: {
  id: string
  distributorId: string
  name: string
  cost: Money
  game: string
  active?: boolean
  syncedAt?: Date
}): Product {
  const id = input.id.trim()
  const distributorId = input.distributorId.trim()
  const name = input.name.trim()
  const game = input.game.trim()
  if (id.length === 0 || distributorId.length === 0 || name.length === 0 || game.length === 0) {
    throw new RangeError()
  }
  return Object.freeze({
    id,
    distributorId,
    name,
    cost: input.cost,
    game,
    active: input.active,
    syncedAt: input.syncedAt,
  })
}
