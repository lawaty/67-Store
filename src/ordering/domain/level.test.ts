import { describe, expect, it } from "vitest"
import {
  DEFAULT_LEVELS,
  defaultLevelsFor,
  levelAt,
  levelProgress,
  levelsToCurve,
  validateLevels,
  type Level,
} from "./level"

function validLevels(): Level[] {
  return DEFAULT_LEVELS.map((level) => ({ ...level }))
}

describe("DEFAULT_LEVELS", () => {
  it("passes validation", () => {
    expect(() => validateLevels(DEFAULT_LEVELS)).not.toThrow()
  })

  it("has 3 levels with the expected keys", () => {
    expect(DEFAULT_LEVELS).toHaveLength(3)
    expect(DEFAULT_LEVELS.map((level) => level.key)).toEqual(["epic", "mythic", "immortal"])
  })
})

describe("defaultLevelsFor", () => {
  it("2000 deep-equals DEFAULT_LEVELS", () => {
    expect(defaultLevelsFor(2000)).toEqual(DEFAULT_LEVELS)
  })

  it("500 -> margins [500, 0, 0]", () => {
    expect(defaultLevelsFor(500).map((level) => level.basisPoints)).toEqual([500, 0, 0])
  })

  it("200 -> margins [200, 0, 0]", () => {
    expect(defaultLevelsFor(200).map((level) => level.basisPoints)).toEqual([200, 0, 0])
  })

  it("rejects -1, 1.5, NaN", () => {
    expect(() => defaultLevelsFor(-1)).toThrow(RangeError)
    expect(() => defaultLevelsFor(1.5)).toThrow(RangeError)
    expect(() => defaultLevelsFor(NaN)).toThrow(RangeError)
  })

  it("does not mutate DEFAULT_LEVELS", () => {
    const before = DEFAULT_LEVELS.map((level) => ({ ...level }))
    const result = defaultLevelsFor(500)
    expect(result).not.toBe(DEFAULT_LEVELS)
    expect(DEFAULT_LEVELS.map((level) => ({ ...level }))).toEqual(before)
  })
})

describe("validateLevels", () => {
  it("rejects fewer than 2 levels", () => {
    expect(() => validateLevels([])).toThrow(RangeError)
    expect(() => validateLevels([validLevels()[0]])).toThrow(RangeError)
  })

  it("rejects non-array", () => {
    expect(() => validateLevels(null as unknown as Level[])).toThrow(RangeError)
  })

  it("rejects non-object entries", () => {
    expect(() => validateLevels([null as unknown as Level, validLevels()[1]])).toThrow(RangeError)
  })

  it("rejects first coins non-zero", () => {
    const levels = validLevels()
    levels[0] = { ...levels[0], coins: 1 }
    expect(() => validateLevels(levels)).toThrow(RangeError)
  })

  it("rejects non-increasing coins", () => {
    const equal = validLevels()
    equal[2] = { ...equal[2], coins: 1000 }
    expect(() => validateLevels(equal)).toThrow(RangeError)

    const decreasing = validLevels()
    decreasing[2] = { ...decreasing[2], coins: 500 }
    expect(() => validateLevels(decreasing)).toThrow(RangeError)
  })

  it("rejects increasing basisPoints", () => {
    const levels = validLevels()
    levels[1] = { ...levels[1], basisPoints: 2500 }
    expect(() => validateLevels(levels)).toThrow(RangeError)
  })

  it("rejects duplicate key", () => {
    const levels = validLevels()
    levels[1] = { ...levels[1], key: "epic" }
    expect(() => validateLevels(levels)).toThrow(RangeError)
  })

  it("rejects uppercase key", () => {
    const levels = validLevels()
    levels[0] = { ...levels[0], key: "Epic" }
    expect(() => validateLevels(levels)).toThrow(RangeError)
  })

  it("rejects key with spaces", () => {
    const leading = validLevels()
    leading[0] = { ...leading[0], key: " epic" }
    expect(() => validateLevels(leading)).toThrow(RangeError)

    const trailing = validLevels()
    trailing[0] = { ...trailing[0], key: "epic " }
    expect(() => validateLevels(trailing)).toThrow(RangeError)
  })

  it("rejects empty title", () => {
    const levels = validLevels()
    levels[0] = { ...levels[0], title: "" }
    expect(() => validateLevels(levels)).toThrow(RangeError)

    const whitespace = validLevels()
    whitespace[0] = { ...whitespace[0], title: "   " }
    expect(() => validateLevels(whitespace)).toThrow(RangeError)
  })

  it("rejects title longer than 40", () => {
    const levels = validLevels()
    levels[0] = { ...levels[0], title: "a".repeat(41) }
    expect(() => validateLevels(levels)).toThrow(RangeError)
  })

  it("rejects unknown icon", () => {
    const levels = validLevels()
    levels[0] = { ...levels[0], icon: "unknown" as unknown as Level["icon"] }
    expect(() => validateLevels(levels)).toThrow(RangeError)
  })

  it("rejects unknown color", () => {
    const levels = validLevels()
    levels[0] = { ...levels[0], color: "red" as unknown as Level["color"] }
    expect(() => validateLevels(levels)).toThrow(RangeError)
  })

  it("rejects negative or fractional coins", () => {
    const negative = validLevels()
    negative[1] = { ...negative[1], coins: -1 }
    expect(() => validateLevels(negative)).toThrow(RangeError)

    const fractional = validLevels()
    fractional[1] = { ...fractional[1], coins: 1000.5 }
    expect(() => validateLevels(fractional)).toThrow(RangeError)
  })

  it("rejects negative or fractional basisPoints", () => {
    const negative = validLevels()
    negative[0] = { ...negative[0], basisPoints: -1 }
    expect(() => validateLevels(negative)).toThrow(RangeError)

    const fractional = validLevels()
    fractional[1] = { ...fractional[1], basisPoints: 1500.5 }
    expect(() => validateLevels(fractional)).toThrow(RangeError)
  })
})

describe("levelsToCurve", () => {
  it("produces the expected curve", () => {
    expect(levelsToCurve(DEFAULT_LEVELS)).toEqual([
      { coins: 0, basisPoints: 2000 },
      { coins: 1000, basisPoints: 1500 },
      { coins: 5000, basisPoints: 1000 },
    ])
  })
})

describe("levelAt", () => {
  it("returns epic at 0, 999, -5 and NaN", () => {
    expect(levelAt(DEFAULT_LEVELS, 0)).toEqual(DEFAULT_LEVELS[0])
    expect(levelAt(DEFAULT_LEVELS, 999)).toEqual(DEFAULT_LEVELS[0])
    expect(levelAt(DEFAULT_LEVELS, -5)).toEqual(DEFAULT_LEVELS[0])
    expect(levelAt(DEFAULT_LEVELS, NaN)).toEqual(DEFAULT_LEVELS[0])
  })

  it("returns mythic at 1000 and 4999", () => {
    expect(levelAt(DEFAULT_LEVELS, 1000)).toEqual(DEFAULT_LEVELS[1])
    expect(levelAt(DEFAULT_LEVELS, 4999)).toEqual(DEFAULT_LEVELS[1])
  })

  it("returns immortal at 5000 and 99999", () => {
    expect(levelAt(DEFAULT_LEVELS, 5000)).toEqual(DEFAULT_LEVELS[2])
    expect(levelAt(DEFAULT_LEVELS, 99999)).toEqual(DEFAULT_LEVELS[2])
  })
})

describe("levelProgress", () => {
  it("at 500 returns epic/mythic/500/50", () => {
    const result = levelProgress(DEFAULT_LEVELS, 500)
    expect(result.current).toEqual(DEFAULT_LEVELS[0])
    expect(result.next).toEqual(DEFAULT_LEVELS[1])
    expect(result.toNext).toBe(500)
    expect(result.percent).toBe(50)
  })

  it("at 0 returns percent 0", () => {
    const result = levelProgress(DEFAULT_LEVELS, 0)
    expect(result.current).toEqual(DEFAULT_LEVELS[0])
    expect(result.percent).toBe(0)
  })

  it("at 5000 returns immortal/null/0/100", () => {
    const result = levelProgress(DEFAULT_LEVELS, 5000)
    expect(result.current).toEqual(DEFAULT_LEVELS[2])
    expect(result.next).toBeNull()
    expect(result.toNext).toBe(0)
    expect(result.percent).toBe(100)
  })

  it("at NaN returns percent 0", () => {
    const result = levelProgress(DEFAULT_LEVELS, NaN)
    expect(result.current).toEqual(DEFAULT_LEVELS[0])
    expect(result.percent).toBe(0)
  })
})
