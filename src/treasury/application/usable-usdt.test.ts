import { describe, expect, test, vi } from "vitest"
import { readAvailableUsdtMilli } from "./usable-usdt"

describe("readAvailableUsdtMilli", () => {
  test("returns recorded USDT minus outstanding in milli-USDT", async () => {
    const deps = {
      recordedUsdt: async () => 700000,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 100,
    }
    await expect(readAvailableUsdtMilli(deps)).resolves.toBe(690000)
  })

  test("uses recorded funds, not a live balance source", async () => {
    const deps = {
      recordedUsdt: async () => 40000,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 100,
    }
    await expect(readAvailableUsdtMilli(deps)).resolves.toBe(30000)
  })

  test("handles a different coin index", async () => {
    const deps = {
      recordedUsdt: async () => 500000,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 20,
    }
    // reserved: 10 coins * 20 minor * 10 = 2000 milli-USDT
    await expect(readAvailableUsdtMilli(deps)).resolves.toBe(498000)
  })

  test("returns negative when recorded USDT is below outstanding", async () => {
    const deps = {
      recordedUsdt: async () => 5000,
      coinsOutstanding: async () => 10,
      coinValueMinor: async () => 100,
    }
    await expect(readAvailableUsdtMilli(deps)).resolves.toBe(-5000)
  })

  test("calls each dependency once", async () => {
    const recordedUsdt = vi.fn(async () => 700000)
    const coinsOutstanding = vi.fn(async () => 10)
    const coinValueMinor = vi.fn(async () => 100)
    await readAvailableUsdtMilli({ recordedUsdt, coinsOutstanding, coinValueMinor })
    expect(recordedUsdt).toHaveBeenCalledTimes(1)
    expect(coinsOutstanding).toHaveBeenCalledTimes(1)
    expect(coinValueMinor).toHaveBeenCalledTimes(1)
  })
})
