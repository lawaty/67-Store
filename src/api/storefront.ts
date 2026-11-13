/**
 * Assembles the storefront read model for a viewer and audience.
 * Loads products, pricing inputs, profiles, and defaults, then presents priced product DTOs.
 */
import type { Container } from "@/container"
import { productAvailability, readStorefrontDefaultMethod, type Product, type StorefrontMethod } from '@/catalogue'
import { usdMinorFloorFromUsdtMilli } from "@/shared/usdt"
import type { Markup } from "@/ordering"
import { priceProduct } from "./pricing"
import { readQualifyingVolume, resolveClientMarkup } from "@/ordering"
import { readAvailableUsdtMilli, readCoinIndex, readCoinValueMinor, readEgpRate } from "@/treasury"

import type { ProfileDto, StorefrontDto, StorefrontGatewaysDto, StorefrontProductDto } from "./contracts"

export type Viewer = {
  readonly accountId: string | null
  readonly clientId: string | null
}

export type Audience = "default" | "client"

export async function readStorefront(c: Container, viewer: Viewer, audience: Audience, now: Date = new Date()): Promise<StorefrontDto> {
  const clientId = audience === "client" ? viewer.clientId : null
  const coinsConsumed = await readQualifyingVolume(c.activity, clientId, now)

  const [products, basisPoints, rate, coinIndex, defaultMethod, gatewaySettings] = await Promise.all([
    c.products.listActive("mlbb"),
    resolveClientMarkup(c.settings, "mlbb", { clientId, coinsConsumed }),
    readEgpRate(c.settings),
    readCoinIndex(c.settings),
    readStorefrontDefaultMethod(c.settings),
    c.gatewaySettings(),
  ])

  const gateways: StorefrontGatewaysDto = {
    card: gatewaySettings.card,
    wallet: gatewaySettings.wallet,
    crypto: gatewaySettings.crypto,
    coins: gatewaySettings.coins,
  }

  const profiles = viewer.accountId === null ? [] : await c.gamingProfiles.listByAccount(viewer.accountId)

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

  const coinValue = coinIndex.coinValueMinor / 100

  // A coin balance is a prepaid reserve: spending coins releases that reserve, so
  // coin purchases are affordable whenever the viewer's own balance covers the
  // coin price, independent of the treasury's direct-pay headroom.
  const coinBalance = viewer.clientId === null ? null : (await c.wallets.getOrCreate(viewer.clientId)).coinBalance

  return {
    signedIn: viewer.accountId !== null,
    products: products.map((product) => {
      const availability = productAvailability({
        active: true,
        costMinor: product.cost.minor,
        availableUsdtMinor: availableUsdMinor,
      })
      return presentProduct(
        product,
        { basisPoints },
        rate,
        coinIndex.coinValueMinor,
        {
          buyable: availability.buyable,
          fundingGapMinor: availability.fundingGapMinor,
          unavailableReason:
            availability.unavailableReason === "inactive" ? null : availability.unavailableReason,
        },
        coinBalance,
      )
    }),
    rate,
    coinValue,
    profiles: profiles.map(presentProfile),
    defaultMethod,
    gateways,
  }
}

export async function readDefaultMethod(c: Container): Promise<StorefrontMethod> {
  return readStorefrontDefaultMethod(c.settings)
}

type StorefrontAvailability = {
  readonly buyable: boolean
  readonly fundingGapMinor: number
  readonly unavailableReason: "insufficient_funds" | "unknown_balance" | null
}

export function presentProduct(
  product: Product,
  markup: Markup,
  rate: number,
  coinValueMinor: number,
  availability: StorefrontAvailability,
  coinBalance: number | null = null,
): StorefrontProductDto {
  const priced = priceProduct(product.cost, markup, rate, coinValueMinor)
  const coinsGap = coinBalance === null ? 0 : Math.max(0, priced.coins - coinBalance)
  return {
    id: product.id,
    name: product.name,
    price: priced.price,
    egp: priced.egp,
    coins: priced.coins,
    isDiamond: /^\d+$/.test(product.name),
    directPayAvailable: availability.buyable,
    buyable: availability.buyable,
    coinsBuyable: coinBalance !== null && coinsGap === 0,
    coinsGap,
    fundingGapMinor: availability.fundingGapMinor,
    unavailableReason: availability.unavailableReason,
  }
}

export function presentProfile(profile: {
  readonly id: string
  
  readonly userId: string
  readonly serverId: string
  readonly game: string
  readonly playerName?: string | null
  readonly createdAt?: string | null
}): ProfileDto {
  return {
    id: profile.id,
    
    userId: profile.userId,
    serverId: profile.serverId,
    game: profile.game,
    playerName: profile.playerName ?? null,
    createdAt: profile.createdAt ?? null,
    preferred: false,
  }
}
