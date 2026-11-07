// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>()
  return { ...actual, useFormStatus: () => ({ pending: formStatus.pending }) }
})

vi.mock("./actions", () => ({ recordFunding: vi.fn() }))

import { FundingModal } from "./funding-modal"

afterEach(() => {
  cleanup()
  formStatus.pending = false
})

describe("FundingModal", () => {
  it("renders 0.00 in both fields when defaults are zero", () => {
    render(<FundingModal defaultEgpPaidMinor={0} defaultUsdtMinor={0} maxUsdtMinor={0} />)

    expect((screen.getByLabelText("إجمالي EGP المدفوع") as HTMLInputElement).value).toBe("0.00")
    expect((screen.getByLabelText("USDT المستلم") as HTMLInputElement).value).toBe("0.00")
    expect(document.body.textContent).toContain("الحر المتاح: 0.00 USDT")
  })

  it("renders nonzero defaults and the free-USDT hint", () => {
    render(<FundingModal defaultEgpPaidMinor={543000} defaultUsdtMinor={10000} maxUsdtMinor={10000} />)

    const egp = screen.getByLabelText("إجمالي EGP المدفوع") as HTMLInputElement
    const usdt = screen.getByLabelText("USDT المستلم") as HTMLInputElement
    expect(egp.value).toBe("5430.00")
    expect(usdt.value).toBe("100.00")
    expect(usdt.getAttribute("max")).toBe("100.00")
    expect(usdt.getAttribute("min")).toBe("0.01")
    expect(usdt.required).toBe(true)
    expect(document.body.textContent).toContain("الحر المتاح: 100.00 USDT")
  })

  it("shows an error and disables submit when USDT exceeds the free cap", () => {
    const { container } = render(
      <FundingModal defaultEgpPaidMinor={543000} defaultUsdtMinor={10000} maxUsdtMinor={10000} />,
    )

    // The dialog is not open in jsdom, so its contents are not in the
    // accessibility tree; query the submit button from the DOM instead.
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(submit.disabled).toBe(false)
    expect(document.body.textContent).not.toContain("الكمية أكبر من USDT الحر المتاح")

    fireEvent.change(screen.getByLabelText("USDT المستلم"), { target: { value: "150.00" } })

    expect(document.body.textContent).toContain("الكمية أكبر من USDT الحر المتاح (100.00 USDT).")
    expect(submit.disabled).toBe(true)
  })
})
