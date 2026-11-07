import { describe, expect, it } from "vitest"
import type { Container } from "@/container"
import { client } from "@/accounts"
import { product } from '@/catalogue'
import { order } from "@/ordering"
import { player } from "@/ordering"
import { money } from "@/shared/money"
import { presentOrder, readOrder } from "./orders"

const sample = order({
  id: "o1",
  token: "tok_abc",
  client: client("c1"),
  product: product({ id: "p1", distributorId: "d1", name: "86", cost: money(800, "USD"), game: "mlbb" }),
  player: player("1", "2"),
  price: money(1000, "USD"),
  status: "PAID",
  promoCodeId: "promo1",
  discountMinor: 500,
  playerName: "Player One",
  markupBasisPoints: 0,
})

function fakeContainer(found: typeof sample | null): Container {
  return {
    orders: {
      findByToken: async () => found,
      save: async () => {},
      findById: async () => found,
      update: async () => {},
      listRecent: async () => [],
      listByClient: async () => [],
      findByDistributorOrderId: async () => null,
      listByStatus: async () => [],
      search: async () => ({ rows: [], total: 0 }),
    },
    promos: {
      listAll: async () => [
        {
          id: "promo1",
          code: "SAVE",
          kind: "PERCENT" as const,
          basisPoints: 1000,
          amountMinor: null,
          maxUses: null,
          uses: 0,
          active: true,
          expiresAt: null,
        },
      ],
      create: async () => {},
      setActive: async () => {},
      redeem: async () => ({ ok: false as const, reason: "unknown" as const }),
    },
    settings: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      all: async () => ({}),
    },
  } as unknown as Container
}

describe("readOrder", () => {
  it("returns the order DTO with resolved promo code and EGP amounts", async () => {
    const dto = await readOrder(fakeContainer(sample), "t1")

    expect(dto).not.toBeNull()
    expect(dto?.status).toBe("PAID")
    expect(dto?.productName).toBe("86")
    expect(dto?.promoCode).toBe("SAVE")
    expect(dto?.player).toEqual({ userId: "1", serverId: "2" })
    expect(dto?.price).toEqual(money(1000, "USD"))
    expect(dto?.egp).toEqual(money(48500, "EGP"))
    expect(dto?.discountEgp).toEqual(money(24250, "EGP"))
    expect(dto?.playerName).toBe("Player One")
  })

  it("returns null for an unknown token", async () => {
    expect(await readOrder(fakeContainer(null), "missing")).toBeNull()
  })
})

describe("presentOrder", () => {
  it("omits the discount when there is none", () => {
    const dto = presentOrder(sample, 48.5, null)
    expect(dto.discountEgp).toEqual(money(24250, "EGP"))

    const undiscounted = presentOrder(
      order({
        id: "o2",
        token: "t2",
        client: client("c1"),
        product: sample.product,
        player: sample.player,
        price: money(1000, "USD"),
        status: "CREATED",
        markupBasisPoints: 0,
      }),
      48.5,
      null,
    )

    expect(undiscounted.discountEgp).toBeNull()
  })
})
