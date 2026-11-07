// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>()
  return { ...actual, useFormStatus: () => ({ pending: formStatus.pending }) }
})

import { SubmitButton } from "./submit-button"

describe("SubmitButton", () => {
  beforeEach(() => {
    formStatus.pending = false
  })

  afterEach(() => {
    cleanup()
    formStatus.pending = false
  })

  it("renders an enabled submit button with children when idle", () => {
    formStatus.pending = false
    render(
      <form>
        <SubmitButton>Save</SubmitButton>
      </form>,
    )
    const button = screen.getByRole("button", { name: /Save/ })
    expect(button.getAttribute("type")).toBe("submit")
    expect((button as HTMLButtonElement).disabled).toBe(false)
    expect(button.getAttribute("aria-busy")).toBeNull()
    expect(button.textContent).toContain("Save")
  })

  it("renders disabled with aria-busy and spinner when pending", () => {
    formStatus.pending = true
    render(
      <form>
        <SubmitButton>Save</SubmitButton>
      </form>,
    )
    const button = screen.getByRole("button")
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(button.getAttribute("aria-busy")).toBe("true")
    expect(button.textContent).toContain("Save")
    expect(button.querySelector(".animate-spin")).toBeTruthy()
  })

  it("shows pendingLabel override when pending", () => {
    formStatus.pending = true
    render(
      <form>
        <SubmitButton pendingLabel="Saving...">Save</SubmitButton>
      </form>,
    )
    const button = screen.getByRole("button")
    expect(button.textContent).toContain("Saving...")
    expect(button.textContent).not.toContain("Save")
  })

  it("forwards props like name, value, and formAction", () => {
    formStatus.pending = false
    render(
      <form>
        <SubmitButton name="direction" value="credit" formAction="/api/x">
          Add
        </SubmitButton>
      </form>,
    )
    const button = screen.getByRole("button", { name: /Add/ })
    expect(button.getAttribute("name")).toBe("direction")
    expect(button.getAttribute("value")).toBe("credit")
    expect(button.getAttribute("formaction")).toBe("/api/x")
  })

  it("applies custom className and defaults to btn btn-primary when omitted", () => {
    formStatus.pending = false
    const { rerender } = render(
      <form>
        <SubmitButton className="custom-class">A</SubmitButton>
      </form>,
    )
    expect(screen.getByRole("button", { name: "A" }).getAttribute("class")).toBe(
      "custom-class",
    )

    rerender(
      <form>
        <SubmitButton>B</SubmitButton>
      </form>,
    )
    expect(screen.getByRole("button", { name: "B" }).getAttribute("class")).toBe(
      "btn btn-primary",
    )
  })
})
