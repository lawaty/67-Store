import { describe, expect, it } from "vitest"
import type { StorefrontDto, StorefrontGatewaysDto, StorefrontProductDto } from "@/api/contracts"
import { bestValueDiamond, egpPerDiamondMinor, methodAvailable, partitionProducts, priceFor } from "./catalogue"

export function buildStorefrontGateways(overrides: Partial<StorefrontGatewaysDto> = {}): StorefrontGatewaysDto {
  return { card: true, wallet: true, crypto: true, coins: true, ...overrides }
}

export function buildStorefrontDto(overrides: Partial<Omit<StorefrontDto, "gateways">> & { gateways?: Partial<StorefrontGatewaysDto> } = {}): StorefrontDto {
  return {
    signedIn: false,
    products: [],
    rate: 48.5,
    coinValue: 0.01,
    profiles: [],
    defaultMethod: "paymob",
    ...overrides,
    gateways: buildStorefrontGateways(overrides.gateways),
  }
}

function product(overrides: Partial<StorefrontProductDto> & Pick<StorefrontProductDto, "id" | "name">): StorefrontProductDto {
  const buyable = overrides.buyable ?? true
  return {
    id: overrides.id,
    name: overrides.name,
    price: overrides.price ?? { minor: 100, currency: "USD" },
    egp: overrides.egp ?? { minor: 1000, currency: "EGP" },
    coins: overrides.coins ?? 10,
    isDiamond: overrides.isDiamond ?? false,
    directPayAvailable: overrides.directPayAvailable ?? buyable,
    buyable,
    coinsBuyable: overrides.coinsBuyable ?? buyable,
    coinsGap: overrides.coinsGap ?? 0,
    fundingGapMinor: overrides.fundingGapMinor ?? 0,
    unavailableReason: overrides.unavailableReason ?? null,
  }
}

describe("partitionProducts", () => {
  it("partitions diamonds and bundles, sorting diamonds by numeric name ascending and preserving bundle order", () => {
    const products = [
      product({ id: "b1", name: "Weekly Pass", isDiamond: false }),
      product({ id: "d86", name: "86", isDiamond: true, egp: { minor: 582000, currency: "EGP" } }),
      product({ id: "b2", name: "Twilight Pass", isDiamond: false }),
      product({ id: "d12", name: "12", isDiamond: true, egp: { minor: 90000, currency: "EGP" } }),
      product({ id: "d172", name: "172", isDiamond: true, egp: { minor: 1100000, currency: "EGP" } }),
      product({ id: "d5", name: "5", isDiamond: true, egp: { minor: 40000, currency: "EGP" } }),
    ]

    const { diamonds, bundles } = partitionProducts(products)

    expect(diamonds.map((p) => p.id)).toEqual(["d5", "d12", "d86", "d172"])
    expect(bundles.map((p) => p.id)).toEqual(["b1", "b2"])
  })

  it("returns empty arrays for empty input", () => {
    expect(partitionProducts([])).toEqual({ diamonds: [], bundles: [] })
  })

  it("does not mutate the input array", () => {
    const products = [
      product({ id: "d86", name: "86", isDiamond: true }),
      product({ id: "d12", name: "12", isDiamond: true }),
    ]
    const snapshot = [...products]
    partitionProducts(products)
    expect(products).toEqual(snapshot)
  })
})

describe("egpPerDiamondMinor", () => {
  it("returns egp.minor / Number(name) for diamonds", () => {
    const diamond = product({ id: "d86", name: "86", isDiamond: true, egp: { minor: 582000, currency: "EGP" } })
    expect(egpPerDiamondMinor(diamond)).toBe(582000 / 86)
  })

  it("returns null for non-diamond products", () => {
    const bundle = product({ id: "b1", name: "86", isDiamond: false, egp: { minor: 582000, currency: "EGP" } })
    expect(egpPerDiamondMinor(bundle)).toBeNull()
  })

  it("returns null when name is not a positive finite number", () => {
    expect(egpPerDiamondMinor(product({ id: "d", name: "Weekly", isDiamond: true }))).toBeNull()
    expect(egpPerDiamondMinor(product({ id: "d", name: "NaN", isDiamond: true }))).toBeNull()
    expect(egpPerDiamondMinor(product({ id: "d", name: "0", isDiamond: true }))).toBeNull()
    expect(egpPerDiamondMinor(product({ id: "d", name: "-5", isDiamond: true }))).toBeNull()
    expect(egpPerDiamondMinor(product({ id: "d", name: "Infinity", isDiamond: true }))).toBeNull()
  })
})

describe("bestValueDiamond", () => {
  it("returns the diamond with the lowest egp per diamond", () => {
    const d12 = product({ id: "d12", name: "12", isDiamond: true, egp: { minor: 96000, currency: "EGP" } }) // 8000
    const d86 = product({ id: "d86", name: "86", isDiamond: true, egp: { minor: 582000, currency: "EGP" } }) // ~6767
    const d172 = product({ id: "d172", name: "172", isDiamond: true, egp: { minor: 1204000, currency: "EGP" } }) // 7000
    expect(bestValueDiamond([d12, d86, d172])?.id).toBe("d86")
  })

  it("excludes unbuyable diamonds from best value", () => {
    const cheapButUnbuyable = product({
      id: "d86",
      name: "86",
      isDiamond: true,
      egp: { minor: 582000, currency: "EGP" },
      buyable: false,
      directPayAvailable: false,
      fundingGapMinor: 100,
      unavailableReason: "insufficient_funds",
    })
    const buyable = product({ id: "d172", name: "172", isDiamond: true, egp: { minor: 1204000, currency: "EGP" } })
    expect(bestValueDiamond([cheapButUnbuyable, buyable])?.id).toBe("d172")
  })

  it("includes diamond products a coins-funded viewer can still buy", () => {
    const coinsOnly = product({
      id: "d86",
      name: "86",
      isDiamond: true,
      egp: { minor: 582000, currency: "EGP" },
      buyable: false,
      directPayAvailable: false,
      coinsBuyable: true,
      unavailableReason: "insufficient_funds",
    })
    const direct = product({ id: "d172", name: "172", isDiamond: true, egp: { minor: 1204000, currency: "EGP" } })
    expect(bestValueDiamond([coinsOnly, direct])?.id).toBe("d86")
  })

  it("returns null when all diamonds are unbuyable", () => {
    const unbuyable = product({ id: "d86", name: "86", isDiamond: true, buyable: false, directPayAvailable: false, unavailableReason: "unknown_balance" })
    expect(bestValueDiamond([unbuyable])).toBeNull()
  })

  it("returns the first diamond on a tie", () => {
    const a = product({ id: "a", name: "10", isDiamond: true, egp: { minor: 50000, currency: "EGP" } })
    const b = product({ id: "b", name: "20", isDiamond: true, egp: { minor: 100000, currency: "EGP" } })
    expect(bestValueDiamond([a, b])?.id).toBe("a")
  })

  it("returns null for an empty array", () => {
    expect(bestValueDiamond([])).toBeNull()
  })

  it("skips diamonds with non-computable rates when possible, preferring a computable one", () => {
    const bad = product({ id: "bad", name: "Weekly", isDiamond: true, egp: { minor: 1, currency: "EGP" } })
    const good = product({ id: "good", name: "86", isDiamond: true, egp: { minor: 582000, currency: "EGP" } })
    expect(bestValueDiamond([bad, good])?.id).toBe("good")
  })
})

describe("methodAvailable", () => {
  it("gates coins on the balance and direct pay on treasury headroom", () => {
    const p = product({ id: "p", name: "86", buyable: false, directPayAvailable: false, coinsBuyable: true })
    expect(methodAvailable(p, "coins", true)).toBe(true)
    expect(methodAvailable(p, "coins", false)).toBe(true)
    expect(methodAvailable(p, "paymob", true)).toBe(false)
    expect(methodAvailable(p, "crypto", true)).toBe(false)
  })
})

describe("priceFor", () => {
  it("renders paymob price with EGP label and no coinAmount", () => {
    const p = product({ id: "p1", name: "86", egp: { minor: 582000, currency: "EGP" } })
    expect(priceFor(p, "paymob", "EGP")).toEqual({ price: "5820.00 EGP" })
    expect(priceFor(p, "paymob", "EGP").coinAmount).toBeUndefined()
  })

  it("renders crypto price in USDT and no coinAmount", () => {
    const p = product({ id: "p2", name: "86", price: { minor: 12000, currency: "USD" } })
    expect(priceFor(p, "crypto", "EGP")).toEqual({ price: "120.00 USDT" })
    expect(priceFor(p, "crypto", "EGP").coinAmount).toBeUndefined()
  })

  it("renders coins price as bare count with coinAmount", () => {
    const p = product({ id: "p3", name: "86", coins: 120 })
    expect(priceFor(p, "coins", "EGP")).toEqual({ price: "120", coinAmount: 120 })
  })

  it("does not mutate the product", () => {
    const p = product({ id: "p4", name: "86", egp: { minor: 582000, currency: "EGP" }, price: { minor: 12000, currency: "USD" }, coins: 120 })
    const snapshot = { ...p, price: { ...p.price }, egp: { ...p.egp } }
    priceFor(p, "paymob", "EGP")
    priceFor(p, "crypto", "EGP")
    priceFor(p, "coins", "EGP")
    expect(p).toEqual(snapshot)
  })
})
