import { describe, expect, test, vi } from "vitest"
import { money } from "../../shared/money"
import { product } from "../domain/product"
import { createPriceCheck } from "./price-check"

describe("createPriceCheck", () => {
  test("Returns ok when price guard disabled.", async () => {
    const alerts = { append: vi.fn().mockResolvedValue(undefined) }
    const fetchCatalogue = vi.fn()
    const priceCheck = createPriceCheck({ fetchCatalogue, toleranceBasisPoints: 100, enabled: false, alerts })
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(100, "USD"), game: "mlbb" })
    const result = await priceCheck(p)
    expect(result).toEqual({ status: "ok" })
    expect(fetchCatalogue).not.toHaveBeenCalled()
    expect(alerts.append).not.toHaveBeenCalled()
  })

  test("Returns stale and appends alert when catalogue fetch throws.", async () => {
    const alerts = { append: vi.fn().mockResolvedValue(undefined) }
    const fetchCatalogue = vi.fn().mockRejectedValue(new Error("boom"))
    const priceCheck = createPriceCheck({ fetchCatalogue, toleranceBasisPoints: 100, enabled: true, alerts })
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(100, "USD"), game: "mlbb" })
    const result = await priceCheck(p)
    expect(result).toEqual({ status: "stale" })
    expect(alerts.append).toHaveBeenCalledWith({ kind: "price_guard", message: "stale catalogue for mlbb/d1" })
  })

  test("Returns stale when catalogue is empty.", async () => {
    const alerts = { append: vi.fn().mockResolvedValue(undefined) }
    const fetchCatalogue = vi.fn().mockResolvedValue([])
    const priceCheck = createPriceCheck({ fetchCatalogue, toleranceBasisPoints: 100, enabled: true, alerts })
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(100, "USD"), game: "mlbb" })
    const result = await priceCheck(p)
    expect(result).toEqual({ status: "stale" })
    expect(alerts.append).toHaveBeenCalledWith({ kind: "price_guard", message: "stale catalogue for mlbb/d1" })
  })

  test("Returns stale when matching live product not found.", async () => {
    const alerts = { append: vi.fn().mockResolvedValue(undefined) }
    const other = product({ id: "p2", distributorId: "d2", name: "Other", cost: money(100, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn().mockResolvedValue([other])
    const priceCheck = createPriceCheck({ fetchCatalogue, toleranceBasisPoints: 100, enabled: true, alerts })
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(100, "USD"), game: "mlbb" })
    const result = await priceCheck(p)
    expect(result).toEqual({ status: "stale" })
    expect(alerts.append).toHaveBeenCalledWith({ kind: "price_guard", message: "stale catalogue for mlbb/d1" })
  })

  test("Returns ok when drift within tolerance.", async () => {
    const alerts = { append: vi.fn().mockResolvedValue(undefined) }
    const live = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(105, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn().mockResolvedValue([live])
    const priceCheck = createPriceCheck({ fetchCatalogue, toleranceBasisPoints: 500, enabled: true, alerts })
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(100, "USD"), game: "mlbb" })
    const result = await priceCheck(p)
    expect(result).toEqual({ status: "ok" })
    expect(alerts.append).not.toHaveBeenCalled()
  })

  test("Returns held and appends alert when drift exceeds tolerance.", async () => {
    const alerts = { append: vi.fn().mockResolvedValue(undefined) }
    const live = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(110, "USD"), game: "mlbb" })
    const fetchCatalogue = vi.fn().mockResolvedValue([live])
    const priceCheck = createPriceCheck({ fetchCatalogue, toleranceBasisPoints: 500, enabled: true, alerts })
    const p = product({ id: "p1", distributorId: "d1", name: "Topup", cost: money(100, "USD"), game: "mlbb" })
    const result = await priceCheck(p)
    expect(result).toEqual({ status: "held", driftBasisPoints: 1000 })
    expect(alerts.append).toHaveBeenCalledWith({
      kind: "price_guard",
      message: "price drift 1000 bps for mlbb/d1",
    })
  })
})
