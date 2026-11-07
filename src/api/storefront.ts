/**
 * Assembles the storefront read model for a viewer and audience.
 * Loads products, pricing inputs, profiles, and defaults, then presents priced product DTOs.
 */
import type { Container } from "@/container"
import { productAvailability, readStorefrontDefaultMethod, type Product, type StorefrontMethod } from '@/catalogue'
import type { Markup } from "@/ordering"
import { priceProduct } from "./pricing"
import { readQualifyingVolume, resolveClientMarkup } from "@/ordering"
import { readAvailableUsdtMinor, readCoinIndex, readCoinValueMinor, readEgpRate } from "@/treasury"

import type { ProfileDto, StorefrontDto, StorefrontProductDto } from "./contracts"

export type Viewer = {
  readonly accountId: string | null
  readonly clientId: string | null
}

export type Audience = "default" | "client"

export async function readStorefront(c: Container, viewer: Viewer, audience: Audience, now: Date = new Date()): Promise<StorefrontDto> {
  const clientId = audience === "client" ? viewer.clientId : null
  const coinsConsumed = await readQualifyingVolume(c.activity, clientId, now)

  const [products, basisPoints, rate, coinIndex, defaultMethod] = await Promise.all([
    c.products.listActive("mlbb"),
    resolveClientMarkup(c.settings, "mlbb", { clientId, coinsConsumed }),
    readEgpRate(c.settings),
    readCoinIndex(c.settings),
    readStorefrontDefaultMethod(c.settings),
  ])

  const profiles = viewer.accountId === null ? [] : await c.gamingProfiles.listByAccount(viewer.accountId)

  const mode = await c.operationsMode()

  let availableUsdtMinor: number | null = null
  if (mode === "live") {
    try {
      availableUsdtMinor = await readAvailableUsdtMinor({
        recordedUsdt: async () => (await c.treasury.snapshot()).usdtMinor,
        coinsOutstanding: () => c.coinSupply.totalCoins(),
        coinValueMinor: () => readCoinValueMinor(c.settings),
      })
    } catch {
      availableUsdtMinor = null
    }
  }

  const coinValue = coinIndex.coinValueMinor / 100

  return {
    signedIn: viewer.accountId !== null,
    products: products.map((product) => {
      const availability =
        mode === "sandbox"
          ? { buyable: true, fundingGapMinor: 0, unavailableReason: null as null }
          : productAvailability({
              active: true,
              costMinor: product.cost.minor,
              availableUsdtMinor,
            })
      return presentProduct(product, { basisPoints }, rate, coinIndex.coinValueMinor, {
        buyable: availability.buyable,
        fundingGapMinor: availability.fundingGapMinor,
        unavailableReason:
          availability.unavailableReason === "inactive" ? null : availability.unavailableReason,
      })
    }),
    rate,
    coinValue,
    profiles: profiles.map(presentProfile),
    defaultMethod,
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
): StorefrontProductDto {
  const priced = priceProduct(product.cost, markup, rate, coinValueMinor)
  return {
    id: product.id,
    name: product.name,
    price: priced.price,
    egp: priced.egp,
    coins: priced.coins,
    isDiamond: /^\d+$/.test(product.name),
    directPayAvailable: availability.buyable,
    buyable: availability.buyable,
    fundingGapMinor: availability.fundingGapMinor,
    unavailableReason: availability.unavailableReason,
  }
}

export function presentProfile(profile: {
  readonly id: string
  readonly label: string
  readonly userId: string
  readonly serverId: string
  readonly game: string
  readonly playerName?: string | null
  readonly createdAt?: string | null
}): ProfileDto {
  return {
    id: profile.id,
    label: profile.label,
    userId: profile.userId,
    serverId: profile.serverId,
    game: profile.game,
    playerName: profile.playerName ?? null,
    createdAt: profile.createdAt ?? null,
    preferred: false,
  }
}
