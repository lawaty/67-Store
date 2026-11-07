import { describe, expect, test, vi } from "vitest"
import { readAvailableUsdtMinor } from "./usable-usdt"

describe("readAvailableUsdtMinor", () => {
  test("returns recorded USDT minus outstanding in USDT minor units", async () => {
    const deps = {
      recordedUsdt: async () => 70000,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 100,
    }
    await expect(readAvailableUsdtMinor(deps)).resolves.toBe(69000)
  })

  test("uses recorded funds, not a live balance source", async () => {
    const deps = {
      recordedUsdt: async () => 4000,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 100,
    }
    await expect(readAvailableUsdtMinor(deps)).resolves.toBe(3000)
  })

  test("handles a different coin index", async () => {
    const deps = {
      recordedUsdt: async () => 50000,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 20,
    }
    // reserved: 10 coins * 20 minor = 200
    await expect(readAvailableUsdtMinor(deps)).resolves.toBe(49800)
  })

  test("returns negative when recorded USDT is below outstanding", async () => {
    const deps = {
      recordedUsdt: async () => 500,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 100,
    }
    await expect(readAvailableUsdtMinor(deps)).resolves.toBe(-500)
  })

  test("calls each dependency once", async () => {
    const recordedUsdt = vi.fn(async () => 70000)
    const coinsOutstanding = vi.fn(async () => 10)
    const coinValueMinor = vi.fn(async () => 100)
    await readAvailableUsdtMinor({ recordedUsdt, coinsOutstanding, coinValueMinor })
    expect(recordedUsdt).toHaveBeenCalledTimes(1)
    expect(coinsOutstanding).toHaveBeenCalledTimes(1)
    expect(coinValueMinor).toHaveBeenCalledTimes(1)
  })
})
