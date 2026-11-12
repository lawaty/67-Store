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
  it("renders 0.000 in USDT and 0.00 in EGP when defaults are zero", () => {
    render(<FundingModal defaultEgpPaidMinor={0} defaultUsdtMilli={0} maxUsdtMilli={0} />)

    expect((screen.getByLabelText("إجمالي EGP المدفوع") as HTMLInputElement).value).toBe("0.00")
    expect((screen.getByLabelText("USDT المستلم") as HTMLInputElement).value).toBe("0.000")
    expect(document.body.textContent).toContain("الحر المتاح: 0.000 USDT")
  })

  it("renders nonzero defaults and the free-USDT hint", () => {
    render(<FundingModal defaultEgpPaidMinor={543000} defaultUsdtMilli={100000} maxUsdtMilli={100000} />)

    const egp = screen.getByLabelText("إجمالي EGP المدفوع") as HTMLInputElement
    const usdt = screen.getByLabelText("USDT المستلم") as HTMLInputElement
    expect(egp.value).toBe("5430.00")
    expect(usdt.value).toBe("100.000")
    expect(usdt.getAttribute("max")).toBe("100.000")
    expect(usdt.getAttribute("min")).toBe("0.001")
    expect(usdt.required).toBe(true)
    expect(document.body.textContent).toContain("الحر المتاح: 100.000 USDT")
  })

  it("shows an error and disables submit when USDT exceeds the free cap", () => {
    const { container } = render(
      <FundingModal defaultEgpPaidMinor={543000} defaultUsdtMilli={100000} maxUsdtMilli={100000} />,
    )

    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(submit.disabled).toBe(false)
    expect(document.body.textContent).not.toContain("الكمية أكبر من USDT الحر المتاح")

    fireEvent.change(screen.getByLabelText("USDT المستلم"), { target: { value: "150.000" } })

    expect(document.body.textContent).toContain("الكمية أكبر من USDT الحر المتاح (100.000 USDT).")
    expect(submit.disabled).toBe(true)
  })
})
