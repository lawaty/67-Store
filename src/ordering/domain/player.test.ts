import { describe, expect, test } from "vitest"
import fc from "fast-check"
import { player } from "./player"

describe("player", () => {
  test("builds a player with the given ids", () => {
    const result = player("user123", "server456")
    expect(result).toEqual({ userId: "user123", serverId: "server456" })
  })

  test("trims both ids", () => {
    const result = player("  user123  ", "  server456  ")
    expect(result).toEqual({ userId: "user123", serverId: "server456" })
  })

  test("throws RangeError when userId is empty or whitespace", () => {
    expect(() => player("", "server456")).toThrow(RangeError)
    expect(() => player("   ", "server456")).toThrow(RangeError)
  })

  test("throws RangeError when serverId is empty or whitespace", () => {
    expect(() => player("user123", "")).toThrow(RangeError)
    expect(() => player("user123", "   ")).toThrow(RangeError)
  })

  test("the returned object is frozen", () => {
    const result = player("user123", "server456")
    expect(Object.isFrozen(result)).toBe(true)
  })

  test("property: for any two non-blank strings, the result has no surrounding whitespace on either id", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (userId, serverId) => {
        const u = userId.trim()
        const s = serverId.trim()
        if (u === "" || s === "") {
          expect(() => player(userId, serverId)).toThrow(RangeError)
        } else {
          const result = player(userId, serverId)
          expect(result.userId).toBe(u)
          expect(result.serverId).toBe(s)
          expect(result.userId).not.toMatch(/^\s|\s$/)
          expect(result.serverId).not.toMatch(/^\s|\s$/)
        }
      })
    )
  })
})
