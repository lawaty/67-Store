// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest"
import { render, cleanup } from "@testing-library/react"

vi.mock("./actions", () => ({ recordDeposit: vi.fn() }))

import { PurchaseModal } from "./purchase-modal"

afterEach(() => {
  cleanup()
})

describe("PurchaseModal", () => {
  it("renders a compact manual purchase dialog with EGP and USDT only", () => {
    const { container } = render(<PurchaseModal />)

    expect(container.querySelector("dialog")).not.toBeNull()
    expect(container.textContent).toContain("شراء جديد")

    const clientId = container.querySelector<HTMLInputElement>('input[name="clientId"]')
    expect(clientId).not.toBeNull()
    expect(clientId?.type).toBe("text")

    const currency = container.querySelector<HTMLSelectElement>('select[name="currency"]')
    expect(currency).not.toBeNull()
    expect(Array.from(currency!.options).map((o) => [o.value, o.textContent])).toEqual([
      ["EGP", "EGP"],
      ["USD", "USDT"],
    ])

    const amount = container.querySelector<HTMLInputElement>('input[name="amount"]')
    expect(amount).not.toBeNull()
    expect(amount?.type).toBe("number")
    expect(amount?.step).toBe("0.01")
    expect(amount?.min).toBe("0.01")
    expect(amount?.inputMode).toBe("decimal")
    expect(amount?.required).toBe(true)

    expect(container.textContent).toContain("تسجيل يدوي")
    expect(container.textContent).toContain("بيموب")
    expect(container.textContent).toContain("Crypto")
    expect(container.textContent).toContain("مش شغالة لسه")
  })
})
