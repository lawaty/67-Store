import { describe, expect, it } from "vitest"
import { mapCatalogue, usdToMinor } from "./catalogue-mapper"
import { money } from "../../shared/money"

describe("usdToMinor", () => {
  it("converts USD amounts to minor units by rounding up to whole cent", () => {
    expect(usdToMinor(0.724)).toBe(73)
    expect(usdToMinor(1.408)).toBe(141)
    expect(usdToMinor(0.745)).toBe(75)
    expect(usdToMinor(1)).toBe(100)
    expect(usdToMinor(0)).toBe(0)
  })

  it("throws RangeError for invalid values", () => {
    expect(() => usdToMinor(-1)).toThrow(RangeError)
    expect(() => usdToMinor(NaN)).toThrow(RangeError)
    expect(() => usdToMinor(Infinity)).toThrow(RangeError)
  })
})

describe("mapCatalogue", () => {
  const fixture = {
    success: true,
    game: "mlbb",
    catalogues: [
      { id: 2793, name: "55", amount: 0.724 },
      { id: 2819, name: "170", amount: 1.408 },
    ],
  }

  it("maps catalogue items to products", () => {
    const products = mapCatalogue("mlbb", fixture)
    expect(products).toHaveLength(2)
    expect(products[0].id).toBe("mlbb:2793")
    expect(products[0].distributorId).toBe("2793")
    expect(products[0].name).toBe("55")
    expect(products[0].cost).toEqual(money(73, "USD"))
    expect(products[1].id).toBe("mlbb:2819")
    expect(products[1].distributorId).toBe("2819")
    expect(products[1].name).toBe("170")
    expect(products[1].cost).toEqual(money(141, "USD"))
  })

  it("ignores extra unknown fields on an item", () => {
    const payload = {
      success: true,
      game: "mlbb",
      catalogues: [{ id: 2793, name: "55", amount: 0.724, extra: "ignored", foo: 123 }],
    }
    const products = mapCatalogue("mlbb", payload)
    expect(products).toHaveLength(1)
    expect(products[0].id).toBe("mlbb:2793")
  })

  it("throws RangeError for invalid payload", () => {
    expect(() => mapCatalogue("mlbb", { success: false })).toThrow(RangeError)
    expect(() => mapCatalogue("mlbb", { })).toThrow(RangeError)
    expect(() => mapCatalogue("mlbb", { catalogues: {} })).toThrow(RangeError)
  })

  it("maps a payload without a success field", () => {
    const payload = { game: "mlbb", catalogues: [{ id: 2793, name: "55", amount: 0.724 }] }
    const products = mapCatalogue("mlbb", payload)
    expect(products).toHaveLength(1)
  })

  it("throws RangeError for invalid items", () => {
    expect(() => mapCatalogue("mlbb", { success: true, catalogues: [{}] })).toThrow(RangeError)
    expect(() => mapCatalogue("mlbb", { success: true, catalogues: [{ id: 1 }] })).toThrow(RangeError)
    expect(() => mapCatalogue("mlbb", { success: true, catalogues: [{ id: 1, name: "x" }] })).toThrow(RangeError)
    expect(() => mapCatalogue("mlbb", { success: true, catalogues: [{ id: 1, name: "x", amount: "0.724" }] })).toThrow(RangeError)
  })

  it("returns empty array for empty catalogues", () => {
    const payload = { success: true, game: "mlbb", catalogues: [] }
    const products = mapCatalogue("mlbb", payload)
    expect(products).toEqual([])
  })
})
