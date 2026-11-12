// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

vi.mock("./profiles/actions", () => ({ addProfile: vi.fn() }))
vi.mock("../../player-identity-fields", () => ({ PlayerIdentityFields: () => <div data-testid="player-identity-fields" /> }))

beforeAll(() => {
  if (typeof HTMLDialogElement !== "undefined") {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  }
})

vi.mock("next/link", () => ({
  default: ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

import { NewProfileDialog } from "./new-profile-dialog"

afterEach(() => {
  cleanup()
})

describe("NewProfileDialog", () => {
  it("renders dialog controls", () => {
    render(<NewProfileDialog locale="en" />)

    expect(screen.getByRole("button", { name: /New profile/i })).toBeTruthy()
    expect(screen.queryByLabelText("Profile name")).toBeNull()
    expect(screen.getByLabelText("Game")).toBeTruthy()
    expect(screen.getByTestId("player-identity-fields")).toBeTruthy()
    expect(screen.getByText(/Save profile/i)).toBeTruthy()
  })

  it("opens dialog when clicking New profile button", () => {
    render(<NewProfileDialog locale="en" />)
    const button = screen.getByRole("button", { name: /New profile/i })
    fireEvent.click(button)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })
})
