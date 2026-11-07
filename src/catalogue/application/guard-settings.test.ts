import { describe, expect, test } from "vitest"
import { SettingsRepository } from "@/shared/settings-repository"
import {
  PRICE_GUARD_ENABLED_KEY,
  PRICE_GUARD_TOLERANCE_KEY,
  DEFAULT_GUARD_TOLERANCE_BPS,
  isPriceGuardEnabled,
  readPriceGuardTolerance,
} from "./guard-settings"

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

describe("guard-settings", () => {
  test("isPriceGuardEnabled defaults to true when unset", async () => {
    const settings = createInMemorySettingsRepository()
    expect(await isPriceGuardEnabled(settings)).toBe(true)
  })

  test("isPriceGuardEnabled is false only when exactly 'false'", async () => {
    const settings = createInMemorySettingsRepository({ [PRICE_GUARD_ENABLED_KEY]: "false" })
    expect(await isPriceGuardEnabled(settings)).toBe(false)
  })

  test("isPriceGuardEnabled is true for any other stored value", async () => {
    for (const v of ["true", "0", "no", ""]) {
      const settings = createInMemorySettingsRepository({ [PRICE_GUARD_ENABLED_KEY]: v })
      expect(await isPriceGuardEnabled(settings)).toBe(true)
    }
  })

  test("readPriceGuardTolerance defaults to 200 when unset", async () => {
    const settings = createInMemorySettingsRepository()
    expect(await readPriceGuardTolerance(settings)).toBe(DEFAULT_GUARD_TOLERANCE_BPS)
  })

  test("readPriceGuardTolerance returns stored valid value", async () => {
    const settings = createInMemorySettingsRepository({ [PRICE_GUARD_TOLERANCE_KEY]: "500" })
    expect(await readPriceGuardTolerance(settings)).toBe(500)
  })

  test("readPriceGuardTolerance falls back on invalid values", async () => {
    for (const v of ["abc", "1.5", "0", "-5", "9007199254740992", "Infinity", "NaN"]) {
      const settings = createInMemorySettingsRepository({ [PRICE_GUARD_TOLERANCE_KEY]: v })
      expect(await readPriceGuardTolerance(settings)).toBe(DEFAULT_GUARD_TOLERANCE_BPS)
    }
  })
})
