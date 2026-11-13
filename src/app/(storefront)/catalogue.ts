/**
 * Pure storefront catalogue helpers: partition products into diamonds/bundles,
 * compute per-diamond EGP (minor units), and pick the best-value diamond.
 * No React; arithmetic matches the storefront page so prices/badges stay stable.
 */
import type { StorefrontProductDto } from "@/api/contracts"
import type { UrlMethod } from "@/app/urls"

export type PartitionedProducts = {
  readonly diamonds: StorefrontProductDto[]
  readonly bundles: StorefrontProductDto[]
}

export function partitionProducts(
  products: readonly StorefrontProductDto[],
): PartitionedProducts {
  const diamonds = products
    .filter((product) => product.isDiamond)
    .sort((a, b) => Number(a.name) - Number(b.name))
  const bundles = products.filter((product) => !product.isDiamond)
  return { diamonds, bundles }
}

export function egpPerDiamondMinor(product: StorefrontProductDto): number | null {
  if (!product.isDiamond) return null
  const count = Number(product.name)
  if (!Number.isFinite(count) || count <= 0) return null
  return product.egp.minor / count
}

export function bestValueDiamond(
  diamonds: readonly StorefrontProductDto[],
): StorefrontProductDto | null {
  const candidates = diamonds.filter((product) => product.buyable || product.coinsBuyable)
  return candidates.reduce<StorefrontProductDto | null>((current, product) => {
    if (!current) return product
    const next = egpPerDiamondMinor(product)
    const previous = egpPerDiamondMinor(current)
    if (next === null) return current
    if (previous === null) return product
    return next < previous ? product : current
  }, null)
}

/**
 * Availability of a product for a payment method. Direct-pay methods need
 * treasury headroom; coins need only the viewer's own balance. Guests are
 * allowed through to the login step rather than being told the product is gone.
 */
export function methodAvailable(
  product: StorefrontProductDto,
  method: UrlMethod,
  signedIn: boolean,
): boolean {
  if (method === "coins") return !signedIn || product.coinsBuyable
  return product.buyable
}

export type ProductPrice = {
  readonly price: string
  readonly coinAmount?: number
}

/**
 * Renders a product's price string for a payment method. Coin prices are
 * returned as a bare count plus `coinAmount` so callers can attach the coin icon.
 */
export function priceFor(
  product: StorefrontProductDto,
  method: UrlMethod,
  egpLabel: string,
): ProductPrice {
  if (method === "crypto") {
    return { price: `${(product.price.minor / 100).toFixed(2)} USDT` }
  }
  if (method === "coins") {
    return { price: String(product.coins), coinAmount: product.coins }
  }
  return { price: `${(product.egp.minor / 100).toFixed(2)} ${egpLabel}` }
}
