import { describe, expect, it, vi } from "vitest"
import { money } from "@/shared/money"
import { markup } from "@/ordering"
import { priceProduct } from "./pricing"
import { readEgpRate } from "@/treasury"
import { readCoinValueMinor } from "@/treasury"
import type { SettingsRepository } from "@/shared/settings-repository"

describe("priceProduct", () => {
  it("applies default 2000bp markup to USD cost", () => {
    const cost = money(10000, "USD")
    const result = priceProduct(cost, markup(2000), 48.5, 100)
    expect(result.price).toEqual(money(12000, "USD"))
  })

  it("converts USD to EGP at rate 48.5", () => {
    const cost = money(10000, "USD")
    const result = priceProduct(cost, markup(2000), 48.5, 100)
    expect(result.egp).toEqual(money(582000, "EGP"))
  })

  it("calculates coins from USD price at coin index value", () => {
    const cost = money(10000, "USD")
    const result = priceProduct(cost, markup(2000), 48.5, 100)
    expect(result.coins).toBe(120)
  })

  it("returns cost when markup is zero", () => {
    const cost = money(10000, "USD")
    const result = priceProduct(cost, markup(0), 48.5, 100)
    expect(result.price).toEqual(cost)
  })

  it("reads egp rate and coin value minor from settings dependencies", async () => {
    const mockSettings: SettingsRepository = {
      get: vi.fn(async (key: string) => (key === "egp_rate" ? "48.5" : key === "coin:index_micro" ? "1000000" : null)),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
      all: vi.fn(async () => ({})),
    }
    const cost = money(10000, "USD")
    const rate = await readEgpRate(mockSettings)
    const coinValueMinor = await readCoinValueMinor(mockSettings)
    const result = priceProduct(cost, markup(2000), rate, coinValueMinor)
    expect(result.coins).toBe(12000)
    expect(result.egp).toEqual(money(582000, "EGP"))
  })

  it("charges 100x coins at the re-denominated base (1 cent per coin)", () => {
    const cost = money(10000, "USD")
    const atOldBase = priceProduct(cost, markup(2000), 48.5, 100)
    const atNewBase = priceProduct(cost, markup(2000), 48.5, 1)
    expect(atOldBase.price).toEqual(money(12000, "USD"))
    expect(atOldBase.coins).toBe(120)
    expect(atNewBase.coins).toBe(12000)
    expect(atNewBase.coins).toBe(atOldBase.coins * 100)
  })
})
