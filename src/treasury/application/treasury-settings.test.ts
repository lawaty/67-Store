import { describe, expect, test } from "vitest"
import { SettingsRepository } from "@/shared/settings-repository"
import { TREASURY_TOLERANCE_KEY, DEFAULT_TREASURY_TOLERANCE, readTreasuryTolerance } from "./treasury-settings"

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

describe("treasury-settings", () => {
  test("readTreasuryTolerance returns the default when the key is absent", async () => {
    const settings = createInMemorySettingsRepository()
    expect(await readTreasuryTolerance(settings)).toBe(DEFAULT_TREASURY_TOLERANCE)
  })

  test("readTreasuryTolerance returns the stored value when valid", async () => {
    const settings = createInMemorySettingsRepository({ [TREASURY_TOLERANCE_KEY]: "250" })
    expect(await readTreasuryTolerance(settings)).toBe(250)
  })

  test("readTreasuryTolerance falls back to the default when invalid", async () => {
    for (const v of ["abc", "1.5", "-5", "9007199254740992", "Infinity", "NaN"]) {
      const settings = createInMemorySettingsRepository({ [TREASURY_TOLERANCE_KEY]: v })
      expect(await readTreasuryTolerance(settings)).toBe(DEFAULT_TREASURY_TOLERANCE)
    }
  })
})
