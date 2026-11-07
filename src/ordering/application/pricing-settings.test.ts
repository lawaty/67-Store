import { describe, expect, test } from "vitest"
import { SettingsRepository } from "@/shared/settings-repository"
import {
  markupBaseKey,
  readBaseMarkup,
  DEFAULT_MARKUP_BASIS_POINTS,
  vipMarkupKey,
  parseVipLevels,
  readVipLevels,
  saveVipLevels,
  parseVipMarkupCurve,
  readVipMarkupCurve,
  markupOverrideKey,
  parseMarkupOverride,
  readMarkupOverride,
  resolveClientMarkup,
} from "./pricing-settings"
import { DEFAULT_LEVELS, defaultLevelsFor, type Level } from "../domain/level"

function createInMemorySettingsRepository(initial: Record<string, string> = {}): SettingsRepository {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    async get(key: string): Promise<string | null> {
      const v = store.get(key)
      if (v === undefined) {
        return null
      }
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
      for (const [k, v] of store.entries()) {
        result[k] = v
      }
      return result
    },
  }
}

describe("pricing-settings", () => {
  test('markupBaseKey("mlbb") is markup:base:mlbb', () => {
    expect(markupBaseKey("mlbb")).toBe("markup:base:mlbb")
  })

  test("readBaseMarkup returns the base value when present", async () => {
    const settings = createInMemorySettingsRepository({ "markup:base:mlbb": "1700" })
    expect((await readBaseMarkup(settings, "mlbb")).basisPoints).toBe(1700)
  })

  test("readBaseMarkup falls back to legacy topup markup when base is absent", async () => {
    const settings = createInMemorySettingsRepository({ "markup:topup_client:mlbb": "1500" })
    expect((await readBaseMarkup(settings, "mlbb")).basisPoints).toBe(1500)
  })

  test("readBaseMarkup ignores reseller markup and uses default when neither base nor topup exists", async () => {
    const settings = createInMemorySettingsRepository({ "markup:reseller:mlbb": "900" })
    expect((await readBaseMarkup(settings, "mlbb")).basisPoints).toBe(DEFAULT_MARKUP_BASIS_POINTS)
  })
})

describe("vip markup settings", () => {
  test('vipMarkupKey("mlbb") is markup:vip:mlbb', () => {
    expect(vipMarkupKey("mlbb")).toBe("markup:vip:mlbb")
  })

  test("parseVipMarkupCurve valid", () => {
    const raw = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1400 }] })
    expect(parseVipMarkupCurve(raw)).toEqual([
      { coins: 0, basisPoints: 2000 },
      { coins: 10000, basisPoints: 1400 },
    ])
  })

  test("parseVipMarkupCurve missing -> null", () => {
    expect(parseVipMarkupCurve(null)).toBeNull()
    expect(parseVipMarkupCurve(undefined)).toBeNull()
  })

  test("parseVipMarkupCurve malformed -> null", () => {
    expect(parseVipMarkupCurve("not json")).toBeNull()
    expect(parseVipMarkupCurve(JSON.stringify({ foo: 1 }))).toBeNull()
  })

  test("parseVipMarkupCurve unsorted -> null", () => {
    const raw = JSON.stringify({ breakpoints: [{ coins: 10, basisPoints: 1000 }, { coins: 0, basisPoints: 2000 }] })
    expect(parseVipMarkupCurve(raw)).toBeNull()
  })

  test("parseVipMarkupCurve increasing bp -> null", () => {
    const raw = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 1000 }, { coins: 10, basisPoints: 2000 }] })
    expect(parseVipMarkupCurve(raw)).toBeNull()
  })

  test("readVipMarkupCurve reads and parses", async () => {
    const raw = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10, basisPoints: 1000 }] })
    const settings = createInMemorySettingsRepository({ "markup:vip:mlbb": raw })
    const curve = await readVipMarkupCurve(settings, "mlbb")
    expect(curve).toEqual([
      { coins: 0, basisPoints: 2000 },
      { coins: 10, basisPoints: 1000 },
    ])
  })

  test("readVipMarkupCurve missing -> defaults derived from base", async () => {
    const settings = createInMemorySettingsRepository()
    expect(await readVipMarkupCurve(settings, "mlbb")).toEqual([
      { coins: 0, basisPoints: 2000 },
      { coins: 1000, basisPoints: 1500 },
      { coins: 5000, basisPoints: 1000 },
    ])
  })

  test("readVipLevels with no stored setting returns defaults from default base (2000)", async () => {
    const settings = createInMemorySettingsRepository()
    const levels = await readVipLevels(settings, "mlbb")
    expect(levels.map((l) => [l.title, l.basisPoints])).toEqual([
      ["Epic", 2000],
      ["Mythic", 1500],
      ["Immortal", 1000],
    ])
    expect(levels).toEqual(defaultLevelsFor(2000))
  })

  test("readVipLevels with stored base 2500 returns defaults 2500/2000/1500", async () => {
    const settings = createInMemorySettingsRepository({ "markup:base:mlbb": "2500" })
    const levels = await readVipLevels(settings, "mlbb")
    expect(levels.map((l) => [l.title, l.basisPoints])).toEqual([
      ["Epic", 2500],
      ["Mythic", 2000],
      ["Immortal", 1500],
    ])
  })

  test("new-format round trip: saveVipLevels then readVipLevels returns exactly the saved levels", async () => {
    const settings = createInMemorySettingsRepository()
    const saved: Level[] = [
      { key: "epic", coins: 0, basisPoints: 2200, title: "Epic", icon: "shield", color: "sky" },
      { key: "mythic", coins: 1000, basisPoints: 1700, title: "Mythic", icon: "gem", color: "gold" },
      { key: "immortal", coins: 5000, basisPoints: 1200, title: "Immortal", icon: "flame", color: "ember" },
    ]
    await saveVipLevels(settings, "mlbb", saved)
    const raw = await settings.get("markup:vip:mlbb")
    expect(raw).toBe(JSON.stringify({ levels: saved }))
    expect(JSON.parse(raw!)).toEqual({ levels: saved })
    expect(await readVipLevels(settings, "mlbb")).toEqual(saved)
  })

  test("legacy breakpoints parse with level_i keys and Epic/Mythic titles; curve matches original", () => {
    const raw = JSON.stringify({
      breakpoints: [
        { coins: 0, basisPoints: 2000 },
        { coins: 1000, basisPoints: 1550 },
      ],
    })
    const levels = parseVipLevels(raw)
    expect(levels).not.toBeNull()
    expect(levels!.map((l) => l.key)).toEqual(["level_0", "level_1"])
    expect(levels!.map((l) => l.title)).toEqual(["Epic", "Mythic"])
    expect(parseVipMarkupCurve(raw)).toEqual([
      { coins: 0, basisPoints: 2000 },
      { coins: 1000, basisPoints: 1550 },
    ])
  })

  test("invalid levels JSON -> parseVipLevels null and readVipLevels falls back to defaults", async () => {
    const base = (): Level[] => DEFAULT_LEVELS.map((l) => ({ ...l }))
    const cases: Array<{ name: string; levels: Level[] }> = []
    {
      const levels = base()
      levels[0] = { ...levels[0], icon: "unknown" as unknown as Level["icon"] }
      cases.push({ name: "bad icon", levels })
    }
    {
      const levels = base()
      levels[1] = { ...levels[1], key: "epic" }
      cases.push({ name: "duplicate key", levels })
    }
    {
      const levels = base()
      levels[1] = { ...levels[1], basisPoints: 2500 }
      cases.push({ name: "non-increasing margins", levels })
    }
    {
      const levels = base()
      levels[0] = { ...levels[0], coins: 1 }
      cases.push({ name: "first coins != 0", levels })
    }
    for (const { name, levels } of cases) {
      const raw = JSON.stringify({ levels })
      expect(parseVipLevels(raw), name).toBeNull()
      const settings = createInMemorySettingsRepository({ "markup:vip:mlbb": raw })
      expect(await readVipLevels(settings, "mlbb"), name).toEqual(defaultLevelsFor(2000))
    }
  })

  test("saveVipLevels rejects an invalid set (RangeError) and does not write", async () => {
    const settings = createInMemorySettingsRepository()
    const invalid: Level[] = DEFAULT_LEVELS.map((l) => ({ ...l }))
    invalid[1] = { ...invalid[1], key: "epic" }
    await expect(saveVipLevels(settings, "mlbb", invalid)).rejects.toThrow(RangeError)
    expect(await settings.get("markup:vip:mlbb")).toBeNull()
  })
})

describe("markup override and client markup resolution", () => {
  test('markupOverrideKey("c1") is markup:override:c1', () => {
    expect(markupOverrideKey("c1")).toBe("markup:override:c1")
  })

  test("parseMarkupOverride parses valid override with optional note", () => {
    expect(
      parseMarkupOverride(JSON.stringify({ basisPoints: 500, note: "vip", updatedAt: "2026-01-01T00:00:00Z" })),
    ).toEqual({ basisPoints: 500, note: "vip", updatedAt: "2026-01-01T00:00:00Z" })
    expect(parseMarkupOverride(JSON.stringify({ basisPoints: 0, updatedAt: "t" }))).toEqual({
      basisPoints: 0,
      updatedAt: "t",
    })
  })

  test("parseMarkupOverride returns null for missing or malformed values", () => {
    expect(parseMarkupOverride(null)).toBeNull()
    expect(parseMarkupOverride(undefined)).toBeNull()
    expect(parseMarkupOverride("nope")).toBeNull()
    expect(parseMarkupOverride(JSON.stringify({}))).toBeNull()
    expect(parseMarkupOverride(JSON.stringify({ basisPoints: -1, updatedAt: "t" }))).toBeNull()
    expect(parseMarkupOverride(JSON.stringify({ basisPoints: 1.5, updatedAt: "t" }))).toBeNull()
    expect(parseMarkupOverride(JSON.stringify({ basisPoints: 1 }))).toBeNull()
    expect(parseMarkupOverride(JSON.stringify({ basisPoints: 1, updatedAt: 1 }))).toBeNull()
    expect(parseMarkupOverride(JSON.stringify({ basisPoints: 1, updatedAt: "t", note: 1 }))).toBeNull()
  })

  test("readMarkupOverride reads and parses", async () => {
    const settings = createInMemorySettingsRepository({
      "markup:override:c1": JSON.stringify({ basisPoints: 700, updatedAt: "t" }),
    })
    expect(await readMarkupOverride(settings, "c1")).toEqual({ basisPoints: 700, updatedAt: "t" })
  })

  test("resolveClientMarkup: override wins over curve and base/legacy", async () => {
    const curve = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
    const settings = createInMemorySettingsRepository({
      "markup:override:c1": JSON.stringify({ basisPoints: 300, updatedAt: "t" }),
      "markup:vip:mlbb": curve,
      "markup:reseller:mlbb": "1500",
      "markup:base:mlbb": "1900",
    })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: "c1", coinsConsumed: 5000 })).toBe(300)
  })

  test("resolveClientMarkup: malformed override is ignored and falls through", async () => {
    const curve = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
    const settings = createInMemorySettingsRepository({
      "markup:override:c1": JSON.stringify({ basisPoints: -1, updatedAt: "t" }),
      "markup:vip:mlbb": curve,
    })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: "c1", coinsConsumed: 10000 })).toBe(1000)
  })

  test("resolveClientMarkup: no stored VIP falls back to defaults derived from base markup, not reseller tier", async () => {
    // Base 1600 -> default levels 1600/1100/600 at 0/1000/5000; at 9999 -> 600.
    // If reseller 1500 were used instead, the result would be 500.
    const settings = createInMemorySettingsRepository({ "markup:base:mlbb": "1600", "markup:reseller:mlbb": "1500" })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: "c1", coinsConsumed: 9999 })).toBe(600)
  })

  test("resolveClientMarkup: no stored VIP and no base falls back to defaults derived from legacy topup markup", async () => {
    // Legacy 1500 -> default levels 1500/1000/500 at 0/1000/5000; at 9999 -> 500.
    const settings = createInMemorySettingsRepository({ "markup:topup_client:mlbb": "1500", "markup:reseller:mlbb": "900" })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: "c1", coinsConsumed: 9999 })).toBe(500)
  })

  test("resolveClientMarkup: curve present interpolates from consumption", async () => {
    const curve = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
    const settings = createInMemorySettingsRepository({ "markup:vip:mlbb": curve, "markup:base:mlbb": "1700" })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: "c1", coinsConsumed: 5000 })).toBe(1500)
  })

  test("resolveClientMarkup: guest skips override lookup; curve applies at 0 consumption", async () => {
    const curve = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
    const settings = createInMemorySettingsRepository({
      "markup:override:null": JSON.stringify({ basisPoints: 1, updatedAt: "t" }),
      "markup:vip:mlbb": curve,
    })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: null, coinsConsumed: 5000 })).toBe(1500)
  })

  test("resolveClientMarkup: guest with no stored VIP falls back to defaults derived from legacy topup markup", async () => {
    // Legacy 1800 -> default levels 1800/1300/800 at 0/1000/5000; at 5000 -> 800.
    const settings = createInMemorySettingsRepository({ "markup:topup_client:mlbb": "1800" })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: null, coinsConsumed: 5000 })).toBe(800)
  })

  test("resolveClientMarkup: invalid/negative consumption clamps to base point", async () => {
    const curve = JSON.stringify({ breakpoints: [{ coins: 0, basisPoints: 2000 }, { coins: 10000, basisPoints: 1000 }] })
    const settings = createInMemorySettingsRepository({ "markup:vip:mlbb": curve })
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: "c1", coinsConsumed: -5 })).toBe(2000)
    expect(await resolveClientMarkup(settings, "mlbb", { clientId: "c1", coinsConsumed: Number.NaN })).toBe(2000)
  })
})
