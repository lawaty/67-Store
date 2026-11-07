import { describe, expect, test } from "vitest"
import { SettingsRepository } from "@/shared/settings-repository"
import {
  DEPOSIT_RATE_KEY,
  DEPOSIT_FEE_BPS_KEY,
  DEFAULT_DEPOSIT_RATES,
  DEFAULT_DEPOSIT_FEE_BPS,
  readDepositRate,
} from "./deposit-settings"
import { readEgpRate, EGP_RATE_KEY } from "./exchange-rate"

function createInMemorySettingsRepository(initial: Record<string, string> = {}): SettingsRepository {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    async get(key: string): Promise<string | null> {
      const v = store.get(key)
      if (v === undefined) return null
      return v
    },
    async set(key: string, value: string): Promise<void> {
      store.set(key, value)
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
    },
    async all(): Promise<Record<string, string>> {
      const result: Record<string, string> = {}
      for (const [k, v] of store.entries()) result[k] = v
      return result
    },
  }
}

describe("deposit-settings", () => {
  test("EGP uses WAC when market is below WAC", async () => {
    const settings = createInMemorySettingsRepository({ [EGP_RATE_KEY]: "40" }) // market 4000 minor
    // wac 5000
    expect(await readDepositRate(settings, "EGP", 5000, 100)).toBe(5000)
  })

  test("EGP uses market when it is above WAC", async () => {
    const settings = createInMemorySettingsRepository({ [EGP_RATE_KEY]: "60" }) // market 6000
    expect(await readDepositRate(settings, "EGP", 5000, 100)).toBe(6000)
  })

  test("fee is applied", async () => {
    const settings = createInMemorySettingsRepository({
      [DEPOSIT_FEE_BPS_KEY("USD")]: "100", // 1%
    })
    // base 100, fee 1% => floor((100*10100+5000)/10000)=floor((1010000+5000)/10000)=101
    expect(await readDepositRate(settings, "USD", 0, 100)).toBe(101)
  })

  test("SAR/AED/JOD defaults", async () => {
    for (const c of ["SAR", "AED", "JOD"] as const) {
      const settings = createInMemorySettingsRepository()
      expect(await readDepositRate(settings, c, 0, 100)).toBe(DEFAULT_DEPOSIT_RATES[c])
    }
  })

  test("stored rate overrides default", async () => {
    const settings = createInMemorySettingsRepository({ [DEPOSIT_RATE_KEY("SAR")]: "999" })
    expect(await readDepositRate(settings, "SAR", 0, 100)).toBe(999)
  })

  test("invalid rate/fee falls back safely", async () => {
    const settings = createInMemorySettingsRepository({
      [DEPOSIT_RATE_KEY("SAR")]: "abc",
      [DEPOSIT_FEE_BPS_KEY("SAR")]: "1.5",
    })
    expect(await readDepositRate(settings, "SAR", 0, 100)).toBe(DEFAULT_DEPOSIT_RATES.SAR)
  })

  test("USD base rate is coin value (1 at index 1.0)", async () => {
    const settings = createInMemorySettingsRepository()
    expect(await readDepositRate(settings, "USD", 0, 1)).toBe(1)
  })

  test("invalid fee negative falls back", async () => {
    const settings = createInMemorySettingsRepository({ [DEPOSIT_FEE_BPS_KEY("USD")]: "-5" })
    expect(await readDepositRate(settings, "USD", 0, 100)).toBe(100)
  })

  test("coinValueMinor 105 scales USD, SAR default, and EGP", async () => {
    const settings = createInMemorySettingsRepository({ [EGP_RATE_KEY]: "60" }) // market 6000 minor
    expect(await readDepositRate(settings, "USD", 0, 105)).toBe(105)
    expect(await readDepositRate(settings, "SAR", 0, 105)).toBe(394) // 375 * 105 / 100 = 393.75
    expect(await readDepositRate(settings, "EGP", 5000, 105)).toBe(6300) // 105 * 6000 / 100
  })
})
