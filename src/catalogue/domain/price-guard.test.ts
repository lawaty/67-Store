import { describe, expect, test } from "vitest"
import { money } from "../../shared/money"
import { driftBasisPoints, guardPrice } from "./price-guard"

describe("driftBasisPoints", () => {
  test("no drift is 0", () => {
    expect(driftBasisPoints(10000, 10000)).toBe(0)
  })

  test("throws RangeError for invalid syncedMinor", () => {
    expect(() => driftBasisPoints(0, 10000)).toThrow(RangeError)
    expect(() => driftBasisPoints(-1, 10000)).toThrow(RangeError)
    expect(() => driftBasisPoints(1.5, 10000)).toThrow(RangeError)
    expect(() => driftBasisPoints(NaN, 10000)).toThrow(RangeError)
  })

  test("throws RangeError for invalid liveMinor", () => {
    expect(() => driftBasisPoints(10000, -1)).toThrow(RangeError)
    expect(() => driftBasisPoints(10000, 1.5)).toThrow(RangeError)
    expect(() => driftBasisPoints(10000, NaN)).toThrow(RangeError)
  })
})

describe("guardPrice", () => {
  test("no drift -> ok 0", () => {
    const result = guardPrice(money(10000, "USD"), money(10000, "USD"), 200)
    expect(result).toEqual({ status: "ok", driftBasisPoints: 0 })
  })

  test("a 2% drift at exactly the tolerance is ok", () => {
    const result = guardPrice(money(10000, "USD"), money(10200, "USD"), 200)
    expect(result.status).toBe("ok")
    expect((result as { driftBasisPoints: number }).driftBasisPoints).toBe(200)
  })

  test("201 bps is held", () => {
    const result = guardPrice(money(10000, "USD"), money(10201, "USD"), 200)
    expect(result.status).toBe("held")
    expect((result as { driftBasisPoints: number }).driftBasisPoints).toBe(201)
  })

  test("a negative drift (live below synced) is held at the same magnitude", () => {
    const result = guardPrice(money(10000, "USD"), money(9799, "USD"), 200)
    expect(result.status).toBe("held")
    expect((result as { driftBasisPoints: number }).driftBasisPoints).toBe(201)
  })

  test("a null live cost is stale", () => {
    const result = guardPrice(money(10000, "USD"), null, 200)
    expect(result).toEqual({ status: "stale" })
  })

  test("a currency mismatch is stale", () => {
    const result = guardPrice(money(10000, "USD"), money(10000, "EGP"), 200)
    expect(result).toEqual({ status: "stale" })
  })

  test("invalid inputs throw", () => {
    expect(() => guardPrice(money(0, "USD"), money(10000, "USD"), 200)).toThrow(RangeError)
    expect(() => guardPrice(money(10000, "USD"), money(-1, "USD"), 200)).toThrow(RangeError)
    expect(() => guardPrice(money(10000, "USD"), money(10000, "USD"), -1)).toThrow(RangeError)
    expect(() => guardPrice(money(10000, "USD"), money(10000, "USD"), 1.5)).toThrow(RangeError)
  })
})
