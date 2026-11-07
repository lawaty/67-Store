/**
 * Order aggregate: enforces identity and financial-snapshot invariants and the
 * order lifecycle. State transitions go through `apply`, which returns a new
 * order rather than mutating the old one.
 */
import { Client } from "@/accounts"
import { Money } from "../../shared/money"
import { OrderEvent, OrderStatus, InvalidTransition, transition } from "./order-status"
import { Player } from "./player"
import { Product } from "@/catalogue"

export type Order = {
  readonly id: string
  readonly token: string
  readonly client: Client
  readonly product: Product
  readonly player: Player
  readonly price: Money
  readonly status: OrderStatus
  readonly paymentReference: string | null
  readonly distributorOrderId: string | null
  readonly createdAt?: Date | string | null
  readonly discountMinor?: number | null
  readonly costMinor?: number | null
  readonly promoCodeId?: string | null
  readonly playerName?: string | null
  readonly wacEgpMinor: number | null
  readonly cogsEgpMinor: number | null
  readonly tradingMarginMinor: number | null
  readonly coinsCharged: number | null
  readonly coinValueMinor: number | null
  readonly coinsConsumed: number | null
  readonly markupBasisPoints: number | null
  readonly refundedAt: string | null
}


export function order(input: { id: string; token: string; client: Client; product: Product; player: Player; price: Money; status?: OrderStatus; paymentReference?: string | null; distributorOrderId?: string | null; createdAt?: Date | string | null; discountMinor?: number | null; costMinor?: number | null; promoCodeId?: string | null; playerName?: string | null; wacEgpMinor?: number | null; cogsEgpMinor?: number | null; tradingMarginMinor?: number | null; coinsCharged?: number | null; coinValueMinor?: number | null; coinsConsumed?: number | null; markupBasisPoints: number | null; refundedAt?: string | null }): Order {
  const trimmedId = input.id.trim()
  if (trimmedId.length === 0) {
    throw new RangeError()
  }
  const trimmedToken = input.token.trim()
  if (trimmedToken.length === 0) {
    throw new RangeError()
  }
  const wacEgpMinor = input.wacEgpMinor === undefined ? null : input.wacEgpMinor
  if (wacEgpMinor !== null && (!Number.isSafeInteger(wacEgpMinor) || wacEgpMinor < 0)) {
    throw new RangeError()
  }
  const cogsEgpMinor = input.cogsEgpMinor === undefined ? null : input.cogsEgpMinor
  if (cogsEgpMinor !== null && (!Number.isSafeInteger(cogsEgpMinor) || cogsEgpMinor < 0)) {
    throw new RangeError()
  }
  const tradingMarginMinor = input.tradingMarginMinor === undefined ? null : input.tradingMarginMinor
  if (tradingMarginMinor !== null && (!Number.isSafeInteger(tradingMarginMinor) || tradingMarginMinor < 0)) {
    throw new RangeError()
  }
  const coinsCharged = input.coinsCharged === undefined ? null : input.coinsCharged
  if (coinsCharged !== null && (!Number.isSafeInteger(coinsCharged) || coinsCharged <= 0)) {
    throw new RangeError()
  }
  const coinValueMinor = input.coinValueMinor === undefined ? null : input.coinValueMinor
  if (coinValueMinor !== null && (!Number.isSafeInteger(coinValueMinor) || coinValueMinor <= 0)) {
    throw new RangeError()
  }
  const coinsConsumed = input.coinsConsumed === undefined ? null : input.coinsConsumed
  if (coinsConsumed !== null && (!Number.isSafeInteger(coinsConsumed) || coinsConsumed < 0)) {
    throw new RangeError()
  }
  const markupBasisPoints = input.markupBasisPoints
  if (markupBasisPoints !== null && (!Number.isSafeInteger(markupBasisPoints) || markupBasisPoints < 0)) {
    throw new RangeError()
  }
  const refundedAtRaw = input.refundedAt === undefined ? null : input.refundedAt
  const refundedAt = refundedAtRaw === null ? null : refundedAtRaw.trim()
  if (refundedAt !== null && refundedAt.length === 0) {
    throw new RangeError()
  }
  return Object.freeze({
    id: trimmedId,
    token: trimmedToken,
    client: input.client,
    product: input.product,
    player: input.player,
    price: input.price,
    status: input.status ?? "CREATED",
    paymentReference: input.paymentReference ?? null,
    distributorOrderId: input.distributorOrderId ?? null,
    createdAt: input.createdAt,
    discountMinor: input.discountMinor,
    costMinor: input.costMinor,
    promoCodeId: input.promoCodeId,
    playerName: input.playerName,
    wacEgpMinor,
    cogsEgpMinor,
    tradingMarginMinor,
    coinsCharged,
    coinValueMinor,
    coinsConsumed,
    markupBasisPoints,
    refundedAt,
  })
}

export function apply(o: Order, event: OrderEvent): Order {
  const nextStatus = transition(o.status, event)
  return Object.freeze({
    id: o.id,
    token: o.token,
    client: o.client,
    product: o.product,
    player: o.player,
    price: o.price,
    status: nextStatus,
    paymentReference: o.paymentReference,
    distributorOrderId: o.distributorOrderId,
    createdAt: o.createdAt,
    discountMinor: o.discountMinor,
    costMinor: o.costMinor,
    promoCodeId: o.promoCodeId,
    playerName: o.playerName,
    wacEgpMinor: o.wacEgpMinor,
    cogsEgpMinor: o.cogsEgpMinor,
    tradingMarginMinor: o.tradingMarginMinor,
    coinsCharged: o.coinsCharged,
    coinValueMinor: o.coinValueMinor,
    coinsConsumed: o.coinsConsumed,
    markupBasisPoints: o.markupBasisPoints,
    refundedAt: o.refundedAt,
  })
}

export function attachPayment(o: Order, reference: string): Order {
  const trimmed = reference.trim()
  if (trimmed.length === 0) {
    throw new RangeError()
  }
  if (o.status !== "AWAITING_PAYMENT") {
    const err = new InvalidTransition("PAYMENT_CONFIRMED" as OrderEvent, o.status)
    err.message = `Cannot attach a payment to ${o.status}`
    throw err
  }
  return Object.freeze({
    id: o.id,
    token: o.token,
    client: o.client,
    product: o.product,
    player: o.player,
    price: o.price,
    status: o.status,
    paymentReference: trimmed,
    distributorOrderId: o.distributorOrderId,
    createdAt: o.createdAt,
    discountMinor: o.discountMinor,
    costMinor: o.costMinor,
    promoCodeId: o.promoCodeId,
    playerName: o.playerName,
    wacEgpMinor: o.wacEgpMinor,
    cogsEgpMinor: o.cogsEgpMinor,
    tradingMarginMinor: o.tradingMarginMinor,
    coinsCharged: o.coinsCharged,
    coinValueMinor: o.coinValueMinor,
    coinsConsumed: o.coinsConsumed,
    markupBasisPoints: o.markupBasisPoints,
    refundedAt: o.refundedAt,
  })
}

export function attachDistributorOrder(o: Order, distributorOrderId: string): Order {
  const trimmed = distributorOrderId.trim()
  if (trimmed.length === 0) {
    throw new RangeError()
  }
  if (o.status !== "FULFILLING") {
    const err = new InvalidTransition("FULFILMENT_STARTED" as OrderEvent, o.status)
    err.message = `Cannot attach a distributor order to ${o.status}`
    throw err
  }
  return Object.freeze({
    id: o.id,
    token: o.token,
    client: o.client,
    product: o.product,
    player: o.player,
    price: o.price,
    status: o.status,
    paymentReference: o.paymentReference,
    distributorOrderId: trimmed,
    createdAt: o.createdAt,
    discountMinor: o.discountMinor,
    costMinor: o.costMinor,
    promoCodeId: o.promoCodeId,
    playerName: o.playerName,
    wacEgpMinor: o.wacEgpMinor,
    cogsEgpMinor: o.cogsEgpMinor,
    tradingMarginMinor: o.tradingMarginMinor,
    coinsCharged: o.coinsCharged,
    coinValueMinor: o.coinValueMinor,
    coinsConsumed: o.coinsConsumed,
    markupBasisPoints: o.markupBasisPoints,
    refundedAt: o.refundedAt,
  })
}

