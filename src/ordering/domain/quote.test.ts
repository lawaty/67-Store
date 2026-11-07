import { describe, expect, test } from "vitest"
import { money } from "../../shared/money"
import { markup } from "./pricing"
import { quote } from "./quote"

describe("quote", () => {
  test("10000 USD at 20 percent markup is 12000", () => {
    const result = quote(money(10000, "USD"), markup(2000))
    expect(result.minor).toBe(12000)
    expect(result.currency).toBe("USD")
  })

  test("currency is preserved for EGP", () => {
    const result = quote(money(10000, "EGP"), markup(2000))
    expect(result.currency).toBe("EGP")
    expect(result.minor).toBe(12000)
  })
})

describe("cost floor", () => {
  test("if marked price is below cost, return cost", () => {
    const cost = money(10000, "USD")
    // markup at 0 gives marked price equal to cost? sellPrice with basisPoints 0: floor((10000*10000 + 5000)/10000) = 10000
    const result = quote(cost, markup(0))
    expect(result).toEqual(quote(cost, markup(0)))
  })
})
