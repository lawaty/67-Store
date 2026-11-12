import { describe, expect, it } from "vitest"
import { funding } from "./funding"
import { consume, availableUsdtMilli, cogsEgpMinor, emptyTreasury, freeUsdtMilli, fund, proRataBasisEgpMinor, wacEgpMinor } from "./wac"

describe("wac", () => {
  it("wacEgpMinor(emptyTreasury) === 0", () => {
    expect(wacEgpMinor(emptyTreasury)).toBe(0)
  })

  it("worked example", () => {
    const lot1 = funding({
      id: "l1",
      egpPaidMinor: 2500000,
      usdtMilli: 500000,
      createdAt: "now",
    })
    let state = fund(emptyTreasury, lot1)
    expect(state).toEqual({ usdtMilli: 500000, basisEgpMinor: 2500000 })
    expect(wacEgpMinor(state)).toBe(5000)

    state = consume(state, 200000)
    expect(wacEgpMinor(state)).toBe(5000)

    const lot2 = funding({
      id: "l2",
      egpPaidMinor: 5500000,
      usdtMilli: 1000000,
      createdAt: "now",
    })
    state = fund(state, lot2)
    expect(wacEgpMinor(state)).toBe(5385)
    state = consume(state, 300000)
    expect(wacEgpMinor(state)).toBe(5385)
  })

  it("cogsEgpMinor half-up rounding", () => {
    expect(cogsEgpMinor(10, 5000)).toBe(50) // 10*5000/1000 = 50
    expect(cogsEgpMinor(30, 5000)).toBe(150)
    // half-up: 10 * 333 / 1000 = 3.33 -> 3
    expect(cogsEgpMinor(10, 333)).toBe(3)
    // 10 * 335 / 1000 = 3.35 -> 3 (floor of 3.85? 3350/1000=3.35)
    expect(cogsEgpMinor(10, 335)).toBe(3)
    expect(cogsEgpMinor(10, 100)).toBe(1) // 10*100/1000=1
    expect(cogsEgpMinor(10, 105)).toBe(1) // 10*105/1000=1.05 -> 1
    // 10*150/1000=1.5 -> 2 (half-up)
    expect(cogsEgpMinor(10, 150)).toBe(2)
  })

  it("proRataBasisEgpMinor debits the exact pro-rata share with one rounding", () => {
    const state = { usdtMilli: 54310, basisEgpMinor: 294976 }
    expect(proRataBasisEgpMinor(17190, state)).toBe(93365)
    expect(proRataBasisEgpMinor(54310, state)).toBe(294976) // draining is exact
    expect(() => proRataBasisEgpMinor(54320, state)).toThrow(RangeError)
    expect(() => proRataBasisEgpMinor(0, state)).toThrow(RangeError)
  })

  it("proRataBasisEgpMinor rounds half-up at the tie", () => {
    expect(proRataBasisEgpMinor(10, { usdtMilli: 20, basisEgpMinor: 3 })).toBe(2)
    expect(proRataBasisEgpMinor(10, { usdtMilli: 30, basisEgpMinor: 100 })).toBe(33)
  })

  it("spending at the live WAC keeps the displayed WAC stable and drains to zero basis", () => {
    let state = { usdtMilli: 54310, basisEgpMinor: 294976 }
    expect(wacEgpMinor(state)).toBe(5431) // 54.31 EGP/USDT

    for (const cost of [17190, 17190, 17210]) {
      state = consume(state, cost)
      expect(wacEgpMinor(state)).toBe(5431)
    }
    expect(state).toEqual({ usdtMilli: 2720, basisEgpMinor: 14773 })

    state = consume(state, state.usdtMilli)
    expect(state).toEqual({ usdtMilli: 0, basisEgpMinor: 0 })
  })

  it("consume throws when spending more than held", () => {
    const lot = funding({
      id: "l1",
      egpPaidMinor: 2500000,
      usdtMilli: 500000,
      createdAt: "now",
    })
    const state = fund(emptyTreasury, lot)
    expect(() => consume(state, 600000)).toThrow(RangeError)
  })

  it("availableUsdtMilli negative when coins outstanding exceed balance", () => {
    expect(availableUsdtMilli(1000, 1500)).toBe(-500)
  })

  it("freeUsdtMilli returns 0 when live balance is null", () => {
    expect(freeUsdtMilli(null, 29980)).toBe(0)
  })

  it("freeUsdtMilli returns 0 when live balance is below recorded", () => {
    expect(freeUsdtMilli(4990, 29980)).toBe(0)
  })

  it("freeUsdtMilli returns live minus recorded when live is above recorded", () => {
    expect(freeUsdtMilli(32980, 29980)).toBe(3000)
  })

  it("fund throws if sum not safe integer", () => {
    const lot = funding({
      id: "l1",
      egpPaidMinor: 5,
      usdtMilli: 100,
      createdAt: "now",
    })
    const state = { usdtMilli: Number.MAX_SAFE_INTEGER, basisEgpMinor: 0 }
    expect(() => fund(state, lot)).toThrow(RangeError)
  })
})
