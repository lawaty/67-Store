import { describe, expect, it } from "vitest"
import * as fc from "fast-check"
import {
  validateMarkupCurve,
  resolveMarkupBasisPoints,
  nextBreakpoint,
  type MarkupBreakpoint,
  type MarkupCurve,
} from "./vip-markup"

const curve: MarkupCurve = [
  { coins: 0, basisPoints: 2000 },
  { coins: 10000, basisPoints: 1400 },
  { coins: 30000, basisPoints: 1000 },
]

describe("validateMarkupCurve", () => {
  it("accepts a valid curve", () => {
    expect(() => validateMarkupCurve(curve)).not.toThrow()
  })

  it("rejects fewer than 2 points", () => {
    expect(() => validateMarkupCurve([{ coins: 0, basisPoints: 2000 }])).toThrow()
  })

  it("rejects empty", () => {
    expect(() => validateMarkupCurve([])).toThrow()
  })

  it("rejects first coins not 0", () => {
    expect(() =>
      validateMarkupCurve([
        { coins: 1, basisPoints: 2000 },
        { coins: 10, basisPoints: 1000 },
      ]),
    ).toThrow()
  })

  it("rejects non-safe-integer coins", () => {
    expect(() =>
      validateMarkupCurve([
        { coins: 0, basisPoints: 2000 },
        { coins: 1.5, basisPoints: 1000 },
      ]),
    ).toThrow()
  })

  it("rejects negative coins", () => {
    expect(() =>
      validateMarkupCurve([
        { coins: 0, basisPoints: 2000 },
        { coins: -1, basisPoints: 1000 },
      ]),
    ).toThrow()
  })

  it("rejects non-increasing coins", () => {
    expect(() =>
      validateMarkupCurve([
        { coins: 0, basisPoints: 2000 },
        { coins: 5, basisPoints: 1000 },
        { coins: 5, basisPoints: 900 },
      ]),
    ).toThrow()
    expect(() =>
      validateMarkupCurve([
        { coins: 0, basisPoints: 2000 },
        { coins: 10, basisPoints: 1000 },
        { coins: 5, basisPoints: 900 },
      ]),
    ).toThrow()
  })

  it("rejects non-safe-integer basisPoints", () => {
    expect(() =>
      validateMarkupCurve([
        { coins: 0, basisPoints: 2000 },
        { coins: 10, basisPoints: 1.5 },
      ]),
    ).toThrow()
  })

  it("rejects negative basisPoints", () => {
    expect(() =>
      validateMarkupCurve([
        { coins: 0, basisPoints: 2000 },
        { coins: 10, basisPoints: -1 },
      ]),
    ).toThrow()
  })

  it("rejects increasing basisPoints", () => {
    expect(() =>
      validateMarkupCurve([
        { coins: 0, basisPoints: 1000 },
        { coins: 10, basisPoints: 2000 },
      ]),
    ).toThrow()
  })
})

describe("resolveMarkupBasisPoints", () => {
  it("base point at 0", () => {
    expect(resolveMarkupBasisPoints(curve, 0)).toBe(2000)
  })

  it("below base clamps to first", () => {
    expect(resolveMarkupBasisPoints(curve, -5)).toBe(2000)
  })

  it("interior interpolation 4000 -> 1760", () => {
    expect(resolveMarkupBasisPoints(curve, 4000)).toBe(1760)
  })

  it("exact breakpoint", () => {
    expect(resolveMarkupBasisPoints(curve, 10000)).toBe(1400)
  })

  it("above last clamps to last", () => {
    expect(resolveMarkupBasisPoints(curve, 100000)).toBe(1000)
  })

  it("rounding", () => {
    const c: MarkupCurve = [
      { coins: 0, basisPoints: 2000 },
      { coins: 3, basisPoints: 1000 },
    ]
    // at 1 coin: 2000 + (1000-2000)*(1/3) = 1666.666 -> 1667
    expect(resolveMarkupBasisPoints(c, 1)).toBe(1667)
  })

  it("non-finite coinsConsumed -> 0", () => {
    expect(resolveMarkupBasisPoints(curve, NaN)).toBe(2000)
    expect(resolveMarkupBasisPoints(curve, Infinity)).toBe(2000)
  })

  it("non-increasing over a sweep", () => {
    let prev = Infinity
    for (let c = 0; c <= 30000; c += 1) {
      const v = resolveMarkupBasisPoints(curve, c)
      expect(v).toBeLessThanOrEqual(prev)
      prev = v
    }
  })

  it("property: non-increasing for random valid curves", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (n) => {
          // build a simple non-increasing curve
          const pts: MarkupBreakpoint[] = [{ coins: 0, basisPoints: 2000 }]
          let coins = 0
          let bp = 2000
          for (let i = 0; i < n; i++) {
            coins += 1000
            bp = Math.max(0, bp - 100)
            pts.push({ coins, basisPoints: bp })
          }
          validateMarkupCurve(pts)
          let prev = Infinity
          for (let c = 0; c <= coins; c += 7) {
            const v = resolveMarkupBasisPoints(pts, c)
            if (v > prev) return false
            prev = v
          }
          return true
        },
      ),
    )
  })
})

describe("nextBreakpoint", () => {
  it("returns first point with coins > consumed", () => {
    expect(nextBreakpoint(curve, 0)).toEqual({ coins: 10000, basisPoints: 1400 })
    expect(nextBreakpoint(curve, 5000)).toEqual({ coins: 10000, basisPoints: 1400 })
    expect(nextBreakpoint(curve, 10000)).toEqual({ coins: 30000, basisPoints: 1000 })
  })

  it("returns null above last", () => {
    expect(nextBreakpoint(curve, 30000)).toBeNull()
    expect(nextBreakpoint(curve, 100000)).toBeNull()
  })

  it("at negative consumed returns first non-zero? first point coins 0 > -1", () => {
    expect(nextBreakpoint(curve, -1)).toEqual({ coins: 0, basisPoints: 2000 })
  })
})
