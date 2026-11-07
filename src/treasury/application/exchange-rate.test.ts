import { describe, expect, test } from "vitest"
import { SettingsRepository } from "@/shared/settings-repository"
import { DEFAULT_EGP_RATE, EGP_RATE_KEY, readEgpRate, toEgp } from "./exchange-rate"
import { money } from "@/shared/money"

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

describe("exchange-rate", () => {
  test("returns stored value", async () => {
    const settings = createInMemorySettingsRepository({ [EGP_RATE_KEY]: "50" })
    expect(await readEgpRate(settings)).toBe(50)
  })
  test("falls back default when absent", async () => {
    const settings = createInMemorySettingsRepository()
    expect(await readEgpRate(settings)).toBe(DEFAULT_EGP_RATE)
  })
  test("falls back when invalid", async () => {
    for (const v of ["abc", "0", "-3"]) {
      const settings = createInMemorySettingsRepository({ [EGP_RATE_KEY]: v })
      expect(await readEgpRate(settings)).toBe(DEFAULT_EGP_RATE)
    }
  })
  test("toEgp basic", () => {
    expect(toEgp(money(12000, "USD"), 50)).toEqual(money(600000, "EGP"))
  })
  test("toEgp rounds", () => {
    expect(toEgp(money(100, "USD"), 48.5)).toEqual(money(4850, "EGP"))
  })
  test("toEgp throws", () => {
    expect(() => toEgp(money(100, "USD"), 0)).toThrow(RangeError)
    expect(() => toEgp(money(100, "USD"), NaN)).toThrow(RangeError)
    expect(() => toEgp(money(100, "USD"), Infinity)).toThrow(RangeError)
  })
})
