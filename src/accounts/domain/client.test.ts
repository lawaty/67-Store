import { describe, expect, test } from "vitest"
import { client } from "./client"

describe("client", () => {
  test("builds a client with the given id", () => {
    const result = client("c1")
    expect(result.id).toBe("c1")
  })

  test("trims the id", () => {
    const result = client("  c2  ")
    expect(result.id).toBe("c2")
  })

  test("throws RangeError for an empty id and for a whitespace-only id", () => {
    expect(() => client("")).toThrow(RangeError)
    expect(() => client("   ")).toThrow(RangeError)
  })

  test("returns a frozen object", () => {
    const result = client("c3")
    expect(Object.isFrozen(result)).toBe(true)
  })
})
