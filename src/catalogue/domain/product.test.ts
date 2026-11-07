import { describe, expect, test } from "vitest"
import fc from "fast-check"
import { money } from "../../shared/money"
import { product } from "./product"

describe("product", () => {
  test("Builds a product and returns the four fields unchanged.", () => {
    const cost = money(100, "USD")
    const result = product({ id: "p1", distributorId: "d1", name: "Topup", cost, game: "mlbb" })
    expect(result.id).toBe("p1")
    expect(result.distributorId).toBe("d1")
    expect(result.name).toBe("Topup")
    expect(result.cost).toBe(cost)
  })

  test("Trims surrounding whitespace from id, distributorId and name.", () => {
    const cost = money(50, "EGP")
    const result = product({ id: " p2 ", distributorId: " d2 ", name: " Game ", cost, game: "mlbb" })
    expect(result.id).toBe("p2")
    expect(result.distributorId).toBe("d2")
    expect(result.name).toBe("Game")
  })

  test("Throws RangeError for an empty or whitespace-only id, distributorId, and name (three cases).", () => {
    const cost = money(10, "USD")
    expect(() => product({ id: "", distributorId: "d1", name: "n", cost, game: "mlbb" })).toThrow(RangeError)
    expect(() => product({ id: "   ", distributorId: "d1", name: "n", cost, game: "mlbb" })).toThrow(RangeError)
    expect(() => product({ id: "p1", distributorId: "", name: "n", cost, game: "mlbb" })).toThrow(RangeError)
    expect(() => product({ id: "p1", distributorId: "   ", name: "n", cost, game: "mlbb" })).toThrow(RangeError)
    expect(() => product({ id: "p1", distributorId: "d1", name: "", cost, game: "mlbb" })).toThrow(RangeError)
    expect(() => product({ id: "p1", distributorId: "d1", name: "   ", cost, game: "mlbb" })).toThrow(RangeError)
  })

  test("The returned object is frozen, so assigning to name throws in strict mode.", () => {
    const cost = money(10, "USD")
    const result = product({ id: "p1", distributorId: "d1", name: "n", cost, game: "mlbb" })
    expect(Object.isFrozen(result)).toBe(true)
    expect(() => {
      ;(result as any).name = "x"
    }).toThrow()
  })

  test("Property: for any non-blank string, product(...).name has no leading or trailing whitespace.", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), (s) => {
        const cost = money(10, "USD")
        const result = product({ id: "id", distributorId: "d", name: s, cost, game: "mlbb" })
        const name = result.name
        expect(name).toBe(name.trim())
      })
    )
  })

  test("Throws RangeError for blank game and trims game.", () => {
    const cost = money(10, "USD")
    expect(() => product({ id: "p1", distributorId: "d1", name: "n", cost, game: "" })).toThrow(RangeError)
    expect(() => product({ id: "p1", distributorId: "d1", name: "n", cost, game: "   " })).toThrow(RangeError)
    const result = product({ id: "p1", distributorId: "d1", name: "n", cost, game: " mlbb " })
    expect(result.game).toBe("mlbb")
  })
})
