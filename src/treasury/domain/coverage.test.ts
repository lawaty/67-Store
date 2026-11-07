import { describe, expect, it } from "vitest"
import { coverageBasisPoints } from "./coverage"

describe("coverage", () => {
  it("100%", () => {
    expect(coverageBasisPoints(10000, 10000)).toBe(10000)
  })

  it("50%", () => {
    expect(coverageBasisPoints(5000, 10000)).toBe(5000)
  })

  it("nothing outstanding", () => {
    expect(coverageBasisPoints(10000, 0)).toBe(10000)
  })

  it("over-coverage above 10000", () => {
    expect(coverageBasisPoints(15000, 10000)).toBe(15000)
  })

  it("throws on bad inputs", () => {
    expect(() => coverageBasisPoints(-1, 10)).toThrow(RangeError)
    expect(() => coverageBasisPoints(10, -1)).toThrow(RangeError)
    expect(() => coverageBasisPoints(1.5, 10)).toThrow(RangeError)
  })
})
