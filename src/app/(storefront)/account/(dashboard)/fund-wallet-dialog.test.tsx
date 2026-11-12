// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

vi.mock("../fund/actions", () => ({ startFunding: vi.fn() }))

import { FundWalletDialog } from "./fund-wallet-dialog"

beforeAll(() => {
  if (typeof HTMLDialogElement !== "undefined") {
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("FundWalletDialog", () => {
  it("renders a Fund wallet button that opens the dialog form", () => {
    render(<FundWalletDialog locale="en" />)

    expect(screen.getByRole("button", { name: /Fund wallet/i })).toBeTruthy()
    expect(screen.getByLabelText("Amount")).toBeTruthy()
    expect(screen.getByLabelText("Currency")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /Fund wallet/i }))
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it("fetches a quote and shows the pay form", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        currency: "EGP",
        amountMinor: 10000,
        rateMinor: 5000,
        coins: 200,
        egpValueMinor: 10000,
      }),
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<FundWalletDialog locale="en" />)

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } })
    fireEvent.submit(screen.getByLabelText("Amount").closest("form")!)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/account/fund?currency=EGP&amountMinor=10000"),
        expect.anything(),
      )
    })

    expect(await screen.findByText("Pay now")).toBeTruthy()
    expect(screen.getByText("200")).toBeTruthy()
  })

  it("shows the mapped error for a failed quote", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "coverage" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    render(<FundWalletDialog locale="en" />)

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } })
    fireEvent.submit(screen.getByLabelText("Amount").closest("form")!)

    expect(await screen.findByText("The treasury cannot cover this amount right now.")).toBeTruthy()
  })

  it("rejects an invalid amount without fetching", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    render(<FundWalletDialog locale="en" />)

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "0" } })
    fireEvent.submit(screen.getByLabelText("Amount").closest("form")!)

    expect(await screen.findByText("Enter a valid amount.")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
