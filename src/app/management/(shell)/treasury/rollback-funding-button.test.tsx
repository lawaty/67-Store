// @vitest-environment jsdom
import React from "react"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>()
  return { ...actual, useFormStatus: () => ({ pending: formStatus.pending }) }
})

vi.mock("./actions", () => ({ rollbackFunding: vi.fn() }))

import { RollbackFundingButton } from "./rollback-funding-button"
import { formatUsdtMilli } from "@/frontend/format"

afterEach(() => {
  cleanup()
  formStatus.pending = false
})

describe("RollbackFundingButton", () => {
  it("renders trigger with trash icon and تراجع label", () => {
    const { container } = render(<RollbackFundingButton id="f1" usdtMilli={100000} />)

    const trigger = screen.getByRole("button", { name: "تراجع" })
    expect(trigger.className).toContain("btn btn-secondary")
    // Icon is decorative svg inside the trigger
    expect(trigger.querySelector("svg")).not.toBeNull()
    expect(container).toBeTruthy()
  })

  it("renders dialog title, formatted USDT amount and warning message", () => {
    render(<RollbackFundingButton id="f1" usdtMilli={100000} />)

    expect(document.body.textContent).toContain("تراجع عن التمويل")
    expect(document.body.textContent).toContain(formatUsdtMilli(100000))
    expect(document.body.textContent).toContain("USDT")
    expect(document.body.textContent).toContain("هيتم حذف حركة التمويل وإعادة حساب WAC والرصيد.")
  })

  it("renders hidden id and a confirm form submit button", () => {
    const { container } = render(<RollbackFundingButton id="f1" usdtMilli={100000} />)

    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="id"]')
    expect(hidden).not.toBeNull()
    expect(hidden?.value).toBe("f1")

    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')
    expect(submit).not.toBeNull()
    expect(submit?.className).toContain("btn btn-danger")
    expect(submit?.textContent).toContain("تأكيد التراجع")

    const form = container.querySelector("form")
    expect(form).not.toBeNull()
    expect(form?.contains(hidden)).toBe(true)
    expect(form?.contains(submit)).toBe(true)
  })
})
