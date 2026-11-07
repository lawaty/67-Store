import { describe, expect, it } from "vitest"
import { funding } from "./funding"
import { consume, availableUsdtMinor, cogsEgpMinor, emptyTreasury, freeUsdtMinor, fund, wacEgpMinor } from "./wac"

describe("wac", () => {
  it("wacEgpMinor(emptyTreasury) === 0", () => {
    expect(wacEgpMinor(emptyTreasury)).toBe(0)
  })

  it("worked example", () => {
    const lot1 = funding({
      id: "l1",
      egpPaidMinor: 2500000,
      usdtMinor: 50000,
      createdAt: "now",
    })
    let state = fund(emptyTreasury, lot1)
    expect(state).toEqual({ usdtMinor: 50000, basisEgpMinor: 2500000 })
    expect(wacEgpMinor(state)).toBe(5000)

    state = consume(state, 20000)
    expect(wacEgpMinor(state)).toBe(5000)

    const lot2 = funding({
      id: "l2",
      egpPaidMinor: 5500000,
      usdtMinor: 100000,
      createdAt: "now",
    })
    state = fund(state, lot2)
    expect(wacEgpMinor(state)).toBe(5385)
  })

  it("cogsEgpMinor half-up rounding", () => {
    expect(cogsEgpMinor(1, 5000)).toBe(50) // 1*5000/100 = 50
    expect(cogsEgpMinor(3, 5000)).toBe(150)
    // half-up: 1 * 333 / 100 = 3.33 -> 3
    expect(cogsEgpMinor(1, 333)).toBe(3)
    // 1 * 335 / 100 = 3.35 -> 3 (floor 3.35? half-up to integer: 3.35 -> 3)
    // test .5 case: numerator/denom .5
    expect(cogsEgpMinor(1, 100)).toBe(1) // 1*100/100=1
    // half-up rounding at .5: 5/2=2.5 -> 3? cogs uses /100. Need numerator*... Let's test 1*105/100=1.05 ->1
    expect(cogsEgpMinor(1, 105)).toBe(1)
    // 1*150/100=1.5 -> 2 (half-up)
    expect(cogsEgpMinor(1, 150)).toBe(2)
  })

  it("consume throws when spending more than held", () => {
    const lot = funding({
      id: "l1",
      egpPaidMinor: 2500000,
      usdtMinor: 50000,
      createdAt: "now",
    })
    const state = fund(emptyTreasury, lot)
    expect(() => consume(state, 60000)).toThrow(RangeError)
  })

  it("availableUsdtMinor negative when coins outstanding exceed balance", () => {
    expect(availableUsdtMinor(100, 150)).toBe(-50)
  })

  it("freeUsdtMinor returns 0 when live balance is null", () => {
    expect(freeUsdtMinor(null, 2998)).toBe(0)
  })

  it("freeUsdtMinor returns 0 when live balance is below recorded", () => {
    expect(freeUsdtMinor(499, 2998)).toBe(0)
  })

  it("freeUsdtMinor returns live minus recorded when live is above recorded", () => {
    expect(freeUsdtMinor(3298, 2998)).toBe(300)
  })

  it("fund throws if sum not safe integer", () => {
    const lot = funding({
      id: "l1",
      egpPaidMinor: 5,
      usdtMinor: 10,
      createdAt: "now",
    })
    const state = { usdtMinor: Number.MAX_SAFE_INTEGER, basisEgpMinor: 0 }
    expect(() => fund(state, lot)).toThrow(RangeError)
  })
})
