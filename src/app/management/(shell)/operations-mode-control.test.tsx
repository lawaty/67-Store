// @vitest-environment jsdom
import React from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./actions", () => ({ saveOperationsMode: vi.fn() }))

import { OperationsModeControl } from "./operations-mode-control"
import { saveOperationsMode } from "./actions"

const mockSave = vi.mocked(saveOperationsMode)

beforeEach(() => {
  mockSave.mockClear()
})

afterEach(() => cleanup())

describe("OperationsModeControl", () => {
  it("renders one switch in sandbox mode: unchecked, labelled Sandbox, posting live", () => {
    render(<OperationsModeControl mode="sandbox" liveReady />)

    const switches = screen.getAllByRole("switch")
    expect(switches).toHaveLength(1)

    const sw = switches[0] as HTMLButtonElement
    expect(sw.getAttribute("aria-checked")).toBe("false")
    expect(sw.textContent).toContain("Sandbox")
    expect(sw.name).toBe("mode")
    expect(sw.value).toBe("live")
  })

  it("renders the switch in live mode: checked, labelled Live, posting sandbox", () => {
    render(<OperationsModeControl mode="live" liveReady />)

    const sw = screen.getByRole("switch") as HTMLButtonElement
    expect(sw.getAttribute("aria-checked")).toBe("true")
    expect(sw.textContent).toContain("Live")
    expect(sw.name).toBe("mode")
    expect(sw.value).toBe("sandbox")
  })

  it("shows the not-configured title and the warn dot when live is not ready", () => {
    render(<OperationsModeControl mode="sandbox" liveReady={false} />)

    const sw = screen.getByRole("switch") as HTMLButtonElement
    expect(sw.getAttribute("title")).toContain("not configured")
    expect(sw.querySelector(".mode-switch-warn")).toBeTruthy()
  })

  it("has no title and no warn dot when live is ready", () => {
    render(<OperationsModeControl mode="sandbox" liveReady />)

    const sw = screen.getByRole("switch") as HTMLButtonElement
    expect(sw.hasAttribute("title")).toBe(false)
    expect(sw.querySelector(".mode-switch-warn")).toBeNull()
  })

  it("does not render the old heading text as a heading or paragraph", () => {
    const { container } = render(<OperationsModeControl mode="live" liveReady />)

    const blocks = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6, p"))
    for (const el of blocks) {
      expect(el.textContent).not.toContain("وضع التشغيل")
    }
    expect(container.textContent).not.toContain("وضع التشغيل")
  })

  it("submits the opposite mode via saveOperationsMode", async () => {
    render(<OperationsModeControl mode="sandbox" liveReady />)

    // Click the switch (the submit button) so the submit event carries it as
    // submitter; only then does its name/value join the FormData.
    fireEvent.click(screen.getByRole("switch"))

    await waitFor(() => expect(mockSave).toHaveBeenCalled())

    const formData = mockSave.mock.calls[0]?.[0] as FormData
    expect(formData).toBeTruthy()
    expect(formData.get("mode")).toBe("live")
  })
})