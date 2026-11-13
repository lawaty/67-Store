/**
 * Reads and presents an order as an API DTO for the boundary.
 * Resolves the promo code and converts price/discount to EGP using the current treasury rate.
 */
import type { Container } from "@/container"
import type { Order } from "@/ordering"
import { apply, attachPayment } from "@/ordering"
import { payment } from "@/payments"
import { coinsForUsdMinor, readCoinValueMinor, readEgpRate, toEgp } from "@/treasury"
import { money } from "@/shared/money"
import type { OrderDto, ResumePaymentMethod, ResumePaymentResultDto } from "./contracts"
import type { RequestSession } from "./auth"

export async function readOrder(c: Container, token: string): Promise<OrderDto | null> {
  const order = await c.orders.findByToken(token)
  if (order === null) return null

  const promos = await c.promos.listAll()
  const promoCode =
    order.promoCodeId === null || order.promoCodeId === undefined
      ? null
      : promos.find((promo) => promo.id === order.promoCodeId)?.code ?? order.promoCodeId

  return presentOrder(order, await readEgpRate(c.settings), promoCode)
}

export function presentOrder(order: Order, rate: number, promoCode: string | null): OrderDto {
  const discountEgp =
    order.discountMinor !== undefined && order.discountMinor !== null && order.discountMinor > 0
      ? toEgp(money(order.discountMinor, order.price.currency), rate)
      : null

  return {
    token: order.token,
    status: order.status,
    productName: order.product.name,
    player: {
      userId: order.player.userId,
      serverId: order.player.serverId,
    },
    price: order.price,
    egp: toEgp(order.price, rate),
    discountEgp,
    promoCode,
    playerName: order.playerName ?? null,
  }
}

export async function resumeOrderPayment(
  c: Container,
  token: string,
  method: ResumePaymentMethod,
  deps: { readonly session: RequestSession | null; readonly newId: () => string },
): Promise<ResumePaymentResultDto> {
  const order = await c.orders.findByToken(token)
  if (order === null) return { ok: false, error: "not_found" }

  if (order.status !== "AWAITING_PAYMENT") return { ok: false, error: "not_awaiting" }

  const existing = await c.payments.findByOrderId(order.id)

  const paid = existing.find((p) => p.status === "PAID")
  if (paid !== undefined) {
    const entry = paid.provider === "COINS"
      ? await c.wallets.findEntryByReference(paid.providerReference)
      : null
    const charged = entry !== null && entry.amount < 0 ? -entry.amount : null
    const recovered = Object.freeze({
      ...apply(attachPayment(order, paid.providerReference), "PAYMENT_CONFIRMED"),
      ...(charged !== null ? { coinsCharged: charged, coinsConsumed: charged } : {}),
    })
    await c.orders.update(recovered)
    return { ok: true, redirectUrl: `/order/${order.token}` }
  }

  if (method === "coins") {
    if (deps.session === null || deps.session.clientId !== order.client.id) {
      return { ok: false, error: "login" }
    }

    const reference = "coins:" + order.id
    const coinValueMinor = await readCoinValueMinor(c.settings)
    const cost = coinsForUsdMinor(order.price.minor, coinValueMinor)

    const debited = await c.wallets.debit(deps.session.clientId, cost, "order:" + order.id, reference)
    if (!debited) return { ok: false, error: "coins" }

    const entry = await c.wallets.findEntryByReference(reference)
    const charged = entry !== null && entry.amount < 0 ? -entry.amount : cost

    const coinsPayment = payment({
      id: deps.newId(),
      orderId: order.id,
      provider: "COINS",
      providerReference: reference,
      amount: order.price,
      status: "PAID",
    })

    let created: boolean
    try {
      created = await c.payments.saveIfAbsent(coinsPayment)
    } catch {
      await c.wallets.reverseDebit(reference)
      return { ok: false, error: "coins" }
    }

    const paidOrder = Object.freeze({
      ...apply(attachPayment(order, reference), "PAYMENT_CONFIRMED"),
      coinsCharged: charged,
      coinsConsumed: charged,
    })

    if (!created) {
      // Another request already owns this payment. Complete the order if it is
      // still awaiting payment, but do not fulfil here: the creator does that.
      const current = await c.orders.findByToken(token)
      if (current !== null && current.status === "AWAITING_PAYMENT") {
        await c.orders.update(
          Object.freeze({
            ...apply(attachPayment(current, reference), "PAYMENT_CONFIRMED"),
            coinsCharged: charged,
            coinsConsumed: charged,
          }),
        )
      }
      return { ok: true, redirectUrl: `/order/${order.token}` }
    }

    await c.orders.update(paidOrder)
    try {
      await c.fulfilOrder(paidOrder)
    } catch (error) {
      console.error("coins fulfilment failed", error)
    }
    return { ok: true, redirectUrl: `/order/${order.token}` }
  }

  const provider = method === "usdt" ? "CRYPTO" : "PAYMOB"
  if (!(await c.paymentProviderAvailable(provider))) {
    return { ok: false, error: "unavailable" }
  }

  try {
    const started = await c.startPayment({ order, provider, returnUrl: `/order/${order.token}` })
    return { ok: true, redirectUrl: started.redirectUrl }
  } catch {
    return { ok: false, error: "unavailable" }
  }
}
