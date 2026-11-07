import { describe, expect, it, vi } from "vitest"
import type { PrismaClient } from "@prisma/client"
import { createPrismaDepositRepository } from "./deposit-repository"

function fakeDb(aggregateResult: {
  _sum: { egpValueMinor: number | null; coins: number | null }
}) {
  return {
    deposit: {
      aggregate: vi.fn().mockResolvedValue(aggregateResult),
    },
  } as unknown as PrismaClient
}

describe("createPrismaDepositRepository.coinWacEgpMinor", () => {
  it("returns the weighted average (sum egpValueMinor / sum coins)", async () => {
    const repo = createPrismaDepositRepository(
      fakeDb({ _sum: { egpValueMinor: 1_000_000, coins: 200 } })
    )
    await expect(repo.coinWacEgpMinor()).resolves.toBe(5000)
  })

  it("rounds half-up to the nearest EGP minor per coin", async () => {
    // 100 / 3 = 33.333... -> 33
    const down = createPrismaDepositRepository(
      fakeDb({ _sum: { egpValueMinor: 100, coins: 3 } })
    )
    await expect(down.coinWacEgpMinor()).resolves.toBe(33)

    // 101 / 2 = 50.5 -> 51 (half-up)
    const up = createPrismaDepositRepository(
      fakeDb({ _sum: { egpValueMinor: 101, coins: 2 } })
    )
    await expect(up.coinWacEgpMinor()).resolves.toBe(51)
  })

  it("returns 0 when there are no coins", async () => {
    const zeroCoins = createPrismaDepositRepository(
      fakeDb({ _sum: { egpValueMinor: 1_000, coins: 0 } })
    )
    await expect(zeroCoins.coinWacEgpMinor()).resolves.toBe(0)

    const nullSums = createPrismaDepositRepository(
      fakeDb({ _sum: { egpValueMinor: null, coins: null } })
    )
    await expect(nullSums.coinWacEgpMinor()).resolves.toBe(0)
  })
})
