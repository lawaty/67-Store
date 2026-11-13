/**
 * Executes storefront checkout: validates product/player/promo, prices and
 * places the order, and starts payment or fulfills coin-funded orders.
 */

import type { Container } from "@/container"
import { client, type Client } from "@/accounts"
import { productAvailability } from "@/catalogue"
import { apply, attachPayment, markup, player, readQualifyingVolume, resolveClientMarkup } from "@/ordering"
import { normalizeCode } from "@/promos"
import { payment, type PaymentProviderName } from "@/payments"
import { coinsForUsdMinor, readAvailableUsdtMilli, readCoinValueMinor } from "@/treasury"
import { POLICY_VERSION } from "@/shared/legal"
import { usdMinorFloorFromUsdtMilli } from "@/shared/usdt"

import type { CheckoutError, CheckoutResultDto } from "./contracts"

export type CheckoutViewer = {
  readonly accountId: string | null
  readonly clientId: string | null
}

export type CheckoutMethod = "egp" | "usdt" | "coins"

export type CheckoutInput = {
  readonly productId: string
  readonly method: CheckoutMethod
  readonly profileId: string
  readonly userId: string
  readonly serverId: string
  readonly promoCode: string
  readonly locale: string
  readonly termsAccepted: boolean
}

export type CheckoutDeps = {
  readonly newId: () => string
  readonly now?: () => Date
}

export async function checkout(
  c: Container,
  viewer: CheckoutViewer,
  input: CheckoutInput,
  deps: CheckoutDeps,
): Promise<CheckoutResultDto> {
  if (input.termsAccepted !== true) {
    return { ok: false, error: "terms" }
  }
  const session =
    viewer.accountId !== null && viewer.clientId !== null
      ? { accountId: viewer.accountId, clientId: viewer.clientId }
      : null

  let userId = input.userId
  let serverId = input.serverId
  let matchedProfileId: string | null = null

  if (input.profileId !== "" && session !== null) {
    const profiles = await c.gamingProfiles.listByAccount(session.accountId)
    const match = profiles.find((profile) => profile.id === input.profileId)
    if (match !== undefined) {
      userId = match.userId
      serverId = match.serverId
      matchedProfileId = match.id
    }
  }

  const products = await c.products.listActive("mlbb")
  const found = products.find((product) => product.id === input.productId)
  if (found === undefined) return { ok: false, error: "product" }

  if (input.method !== "coins") {
    let availableUsdMinor: number | null = null
    try {
      const availableUsdtMilli = await readAvailableUsdtMilli({
        recordedUsdt: async () => (await c.treasury.snapshot()).usdtMilli,
        coinsOutstanding: () => c.coinSupply.totalCoins(),
        coinValueMinor: () => readCoinValueMinor(c.settings),
      })
      availableUsdMinor = usdMinorFloorFromUsdtMilli(availableUsdtMilli)
    } catch {
      availableUsdMinor = null
    }
    const availability = productAvailability({ active: true, costMinor: found.cost.minor, availableUsdtMinor: availableUsdMinor })
    if (!availability.buyable) return { ok: false, error: "unavailable" }
  }

  const gateways = await c.gatewaySettings()
  if (input.method === "coins" && !gateways.coins) {
    return { ok: false, error: "payment" }
  }
  if (input.method === "usdt" && !gateways.crypto) {
    return { ok: false, error: "payment" }
  }

  const provider: PaymentProviderName = input.method === "usdt" ? "CRYPTO" : "PAYMOB"
  if (input.method !== "coins" && !(await c.paymentProviderAvailable(provider))) {
    return { ok: false, error: "payment" }
  }

  if (userId.trim() === "" || serverId.trim() === "") return { ok: false, error: "player" }

  let target: ReturnType<typeof player>
  try {
    target = player(userId, serverId)
  } catch {
    return { ok: false, error: "player" }
  }

  const check = await c.distributor.checkPlayer({ game: "mlbb", player: target })
  if (!check.valid) return { ok: false, error: "player" }

  const nowDate = (deps.now ?? (() => new Date()))()
  const now = nowDate.toISOString()

  let buyer: Client | null = null
  let resolvedMarkup: number | null = null

  if (session !== null) {
    const foundClient = await c.clients.findById(session.clientId)
    if (foundClient !== null) {
      buyer = foundClient
      const coinsConsumed = await readQualifyingVolume(c.activity, session.clientId, nowDate)
      resolvedMarkup = await resolveClientMarkup(c.settings, "mlbb", {
        clientId: session.clientId,
        coinsConsumed,
      })
    }
  }

  if (buyer === null || resolvedMarkup === null) {
    buyer = client(deps.newId())
    await c.clients.save(buyer)
    resolvedMarkup = await resolveClientMarkup(c.settings, "mlbb", {
      clientId: null,
      coinsConsumed: 0,
    })
  }

  const profileId =
    matchedProfileId ??
    (
      await c.gamingProfiles.add({
        id: deps.newId(),
        clientId: buyer.id,
        accountId: session === null ? null : session.accountId,
        game: "mlbb",
        userId: target.userId,
        serverId: target.serverId,
        playerName: check.name,
      })
    ).id

  const buyerMarkup = markup(resolvedMarkup)

  const promoCodeRaw = input.promoCode.trim()

  if (promoCodeRaw !== "") {
    const promos = await c.promos.listAll()
    let normalized: string
    try {
      normalized = normalizeCode(promoCodeRaw)
    } catch {
      return { ok: false, error: "promo-unknown" }
    }

    const promo = promos.find((candidate) => candidate.code === normalized)

    if (promo === undefined) return { ok: false, error: "promo-unknown" }
    if (!promo.active) return { ok: false, error: "promo-inactive" }
    if (promo.expiresAt !== null && promo.expiresAt <= now) return { ok: false, error: "promo-expired" }
    if (promo.maxUses !== null && promo.uses >= promo.maxUses) return { ok: false, error: "promo-exhausted" }
  }

  const priceResult = await c.checkPrice(found)
  if (priceResult.status !== "ok") return { ok: false, error: "price" }

  const coinValueMinor = await readCoinValueMinor(c.settings)

  const placed = await c.placeOrder({
    client: buyer,
    product: found,
    player: target,
    markup: buyerMarkup,
    coinValueMinor,
    promoCode: promoCodeRaw === "" ? null : promoCodeRaw,
    playerName: check.name,
    profileId,
    termsVersion: POLICY_VERSION,
    termsAcceptedAt: (deps.now?.() ?? new Date()).toISOString(),
  })

  if (placed.promoError !== null) {
    try {
      await c.orders.update(apply(placed.order, "DELIVERY_FAILED"))
    } catch {
      // The order's terminal state is best-effort; the promo error is the answer.
    }
    return { ok: false, error: (`promo-${placed.promoError}`) as CheckoutError }
  }

  if (placed.order.markupBasisPoints !== resolvedMarkup) {
    throw new Error("markup snapshot mismatch")
  }

  const awaitingBase = apply(placed.order, "REQUEST_PAYMENT")
  const coinsConsumed = coinsForUsdMinor(awaitingBase.price.minor, coinValueMinor)
  const awaiting = Object.freeze({ ...awaitingBase, coinsConsumed })
  await c.orders.update(awaiting)

  if (input.method === "coins") {
    if (session === null) return { ok: false, error: "login" }

    const cost = coinsForUsdMinor(awaiting.price.minor, coinValueMinor)
    const paid = await c.wallets.debit(session.clientId, cost, "order:" + awaiting.id)
    if (!paid) return { ok: false, error: "coins" }

    await c.payments.save(
      payment({
        id: deps.newId(),
        orderId: awaiting.id,
        provider: "COINS",
        providerReference: "coins:" + awaiting.id,
        amount: awaiting.price,
        status: "PAID",
      }),
    )
    const paidOrder = Object.freeze({ ...apply(attachPayment(awaiting, "coins:" + awaiting.id), "PAYMENT_CONFIRMED"), coinsCharged: cost, coinsConsumed: cost })
    await c.orders.update(paidOrder)
    try {
      await c.fulfilOrder(paidOrder)
    } catch (error) {
      console.error("coins fulfilment failed", error)
    }

    return { ok: true, redirectUrl: `/order/${awaiting.token}` }
  }

  try {
    const started = await c.startPayment({ order: awaiting, provider, returnUrl: `/order/${awaiting.token}` })
    return { ok: true, redirectUrl: started.redirectUrl }
  } catch {
    return { ok: false, error: "payment", redirectUrl: `/order/${awaiting.token}` }
  }
}
