// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>()
  return { ...actual, useFormStatus: () => ({ pending: formStatus.pending }) }
})

vi.mock("./actions", () => ({ saveP2pSettings: vi.fn() }))

import { saveP2pSettings } from "./actions"
import { P2pSettingsModal } from "./p2p-settings-modal"

afterEach(() => {
  cleanup()
  formStatus.pending = false
})

describe("P2pSettingsModal", () => {
  beforeEach(() => {
    if (typeof window.HTMLDialogElement !== "undefined" && !window.HTMLDialogElement.prototype.showModal) {
      window.HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {}
    }
  })

  const p2pSettings = {
    windowHours: 24,
    minWindowHours: 1,
    maxWindowHours: 720,
    syncIntervalSeconds: 300,
    minSyncIntervalSeconds: 300,
    maxSyncIntervalSeconds: 10800,
    recommendedSyncIntervalSeconds: 300,
    outlierSigma: 2,
    minOutlierSigma: 1,
    maxOutlierSigma: 5,
  }

  it("binds sync interval input min/max to props and shows interval fact", () => {
    render(<P2pSettingsModal p2pSettings={p2pSettings} />)

    const trigger = screen.getByRole("button", { name: /إعدادات P2P/ })
    expect(trigger).toBeTruthy()

    const dialog = document.querySelector("dialog") as HTMLDialogElement
    expect(dialog).toBeTruthy()
    const showModalSpy = vi.fn()
    dialog.showModal = showModalSpy
    fireEvent.click(trigger)
    expect(showModalSpy).toHaveBeenCalled()

    const input = screen.getByLabelText("فاصل المزامنة (ثانية)") as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.getAttribute("min")).toBe("300")
    expect(input.getAttribute("max")).toBe("10800")
    expect(input.name).toBe("syncIntervalSeconds")
    expect(input.value).toBe("300")

    const text = document.body.textContent ?? ""
    expect(text).toContain("5 دقائق")
    expect(text).toContain("300")
    expect(text).toContain("3 ساعات")
    expect(text).toContain("10800")
  })

  it("renders outlier sigma control with bounds/default and includes it in summary", () => {
    render(<P2pSettingsModal p2pSettings={p2pSettings} />)

    const sigma = screen.getByLabelText("حد استبعاد الشواذ (σ)") as HTMLInputElement
    expect(sigma.name).toBe("outlierSigma")
    expect(sigma.getAttribute("min")).toBe("1")
    expect(sigma.getAttribute("max")).toBe("5")
    expect(sigma.getAttribute("step")).toBe("1")
    expect(sigma.value).toBe("2")

    expect(document.body.textContent ?? "").toContain("استبعاد الشواذ 2σ")
  })

  it("submits entered outlierSigma via saveP2pSettings", async () => {
    const { container } = render(<P2pSettingsModal p2pSettings={p2pSettings} />)
    const form = container.querySelector("form")
    expect(form).not.toBeNull()

    const sigma = screen.getByLabelText("حد استبعاد الشواذ (σ)") as HTMLInputElement
    fireEvent.change(sigma, { target: { value: "4" } })

    const submit = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(submit).not.toBeNull()
    fireEvent.click(submit)

    await waitFor(() => expect(saveP2pSettings).toHaveBeenCalled())
    const formData = (saveP2pSettings as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as FormData
    expect(formData.get("outlierSigma")).toBe("4")
  })
})
