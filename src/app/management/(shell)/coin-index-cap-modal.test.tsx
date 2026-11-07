// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>()
  return { ...actual, useFormStatus: () => ({ pending: formStatus.pending }) }
})

vi.mock("./actions", () => ({ saveCoinIndexCap: vi.fn() }))

import { CoinIndexCapModal } from "./coin-index-cap-modal"

afterEach(() => {
  cleanup()
  formStatus.pending = false
})

describe("CoinIndexCapModal", () => {
  beforeEach(() => {
    if (typeof window.HTMLDialogElement !== "undefined" && !window.HTMLDialogElement.prototype.showModal) {
      window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {}
    }
  })

  it("renders the trigger button with the expected label and class", () => {
    render(<CoinIndexCapModal coinIndexCapBps={250} />)
    const trigger = screen.getByRole("button", { name: /حد تغيير المؤشر/ })
    expect(trigger).toBeTruthy()
    expect(trigger.className).toContain("btn")
    expect(trigger.className).toContain("btn-secondary")
  })

  it("opens the dialog and shows the current value and input", () => {
    render(<CoinIndexCapModal coinIndexCapBps={250} />)
    const trigger = screen.getByRole("button", { name: /حد تغيير المؤشر/ })

    const dialog = document.querySelector("dialog") as HTMLDialogElement
    expect(dialog).toBeTruthy()

    const showModalSpy = vi.fn()
    dialog.showModal = showModalSpy

    fireEvent.click(trigger)
    expect(showModalSpy).toHaveBeenCalled()

    // Dialog content: title, current-value hint, input with exact bounds
    expect(document.body.textContent).toContain("حد تغيير المؤشر")
    expect(document.body.textContent).toContain("الحد الحالي: 250 نقطة أساس.")
    const input = screen.getByLabelText("الحد الأقصى (نقاط أساس)") as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.value).toBe("250")
    expect(input.getAttribute("min")).toBe("0")
    expect(input.getAttribute("max")).toBe("10000")
    expect(input.getAttribute("step")).toBe("1")
    expect(input.name).toBe("coinIndexCapBps")
  })
})
