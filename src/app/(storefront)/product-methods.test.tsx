// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { ProductMethods } from "./product-methods"

const options = [
  { id: "a", label: "Option A", href: "/a", price: "10 EGP" },
  { id: "b", label: "Option B", href: "/b", price: "20 EGP" },
]

const disabledOptions = [
  { id: "paymob", label: "Paymob", href: "/i", price: "10 EGP", disabled: true },
  { id: "coins", label: "Coins", href: "/k", price: "5", coinAmount: 5 },
]

const allDisabledOptions = [
  { id: "paymob", label: "Paymob", href: "/i", price: "10 EGP", disabled: true },
]

const originalShowPicker = (HTMLSelectElement.prototype as { showPicker?: () => void }).showPicker

afterEach(() => {
  cleanup()
  if (originalShowPicker === undefined) {
    delete (HTMLSelectElement.prototype as { showPicker?: () => void }).showPicker
  } else {
    (HTMLSelectElement.prototype as { showPicker?: () => void }).showPicker = originalShowPicker
  }
})

describe("offered options follow gateway flags", () => {
  it("omits coins when coins are disabled", () => {
    const gateways = { card: true, wallet: true, crypto: false, coins: false }
    const methods = [
      ...(gateways.card || gateways.wallet ? [{ id: "paymob", label: "Paymob", href: "/i", price: "10 EGP" }] : []),
      ...(gateways.coins ? [{ id: "coins", label: "Coins", href: "/k", price: "5", coinAmount: 5 }] : []),
      ...(gateways.crypto ? [{ id: "crypto", label: "Crypto", href: "/c", price: "1 USDT" }] : []),
    ]
    render(<ProductMethods options={methods} label="Method" ctaLabel="Buy" />)
    expect(screen.queryByRole("option", { name: "Coins" })).toBeNull()
    expect(screen.getByRole("option", { name: "Paymob" })).toBeTruthy()
  })

  it("omits paymob when card and wallet are disabled", () => {
    const gateways = { card: false, wallet: false, crypto: false, coins: true }
    const methods = [
      ...(gateways.card || gateways.wallet ? [{ id: "paymob", label: "Paymob", href: "/i", price: "10 EGP" }] : []),
      ...(gateways.coins ? [{ id: "coins", label: "Coins", href: "/k", price: "5", coinAmount: 5 }] : []),
      ...(gateways.crypto ? [{ id: "crypto", label: "Crypto", href: "/c", price: "1 USDT" }] : []),
    ]
    render(<ProductMethods options={methods} label="Method" ctaLabel="Buy" />)
    expect(screen.queryByRole("option", { name: "Paymob" })).toBeNull()
    expect(screen.getByRole("option", { name: "Coins" })).toBeTruthy()
  })
})

describe("ProductMethods", () => {
  it("prevents default on mousedown, opens picker on click, and keeps state working", () => {
    const showPicker = vi.fn()
    Object.defineProperty(HTMLSelectElement.prototype, "showPicker", {
      value: showPicker,
      writable: true,
      configurable: true,
    })

    render(
      <ProductMethods
        options={options}
        label="Method"
        ctaLabel="Buy"
        defaultId="a"
        showCtaLabel={false}
      />,
    )

    const combobox = screen.getByRole("combobox")

    const mousedown = new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    combobox.dispatchEvent(mousedown)
    expect(mousedown.defaultPrevented).toBe(true)

    fireEvent.click(combobox)
    expect(showPicker).toHaveBeenCalledTimes(1)

    fireEvent.change(combobox, { target: { value: "b" } })
    expect(screen.getByText(/20 EGP/)).toBeTruthy()
  })

  it("preserves native behaviour when showPicker is unavailable", () => {
    delete (HTMLSelectElement.prototype as { showPicker?: () => void }).showPicker

    render(
      <ProductMethods
        options={options}
        label="Method"
        ctaLabel="Buy"
        defaultId="a"
        showCtaLabel={false}
      />,
    )

    const combobox = screen.getByRole("combobox")
    const mousedown = new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    combobox.dispatchEvent(mousedown)
    expect(mousedown.defaultPrevented).toBe(false)
  })

  it("renders combobox, both options, and pointer-events-none arrow overlay", () => {
    const { container } = render(
      <ProductMethods
        options={options}
        label="Method"
        ctaLabel="Buy"
        defaultId="a"
        showCtaLabel={false}
      />,
    )

    expect(screen.getByRole("combobox")).toBeTruthy()
    expect(screen.getByRole("option", { name: "Option A" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "Option B" })).toBeTruthy()
    const overlay = container.querySelector(".pointer-events-none")
    expect(overlay).toBeTruthy()
    expect(overlay?.classList.contains("pointer-events-none")).toBe(true)
  })

  it("a disabled option renders with disabled", () => {
    render(
      <ProductMethods
        options={disabledOptions}
        label="Method"
        ctaLabel="Buy"
        defaultId="coins"
      />,
    )

    expect((screen.getByRole("option", { name: "Paymob" }) as HTMLOptionElement).disabled).toBe(true)
    expect((screen.getByRole("option", { name: "Coins" }) as HTMLOptionElement).disabled).toBe(false)
  })

  it("initial selection skips a disabled first option when no default is provided", () => {
    render(
      <ProductMethods
        options={disabledOptions}
        label="Method"
        ctaLabel="Buy"
      />,
    )

    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("coins")
  })

  it("selects a disabled default option so unavailable products show the preferred price", () => {
    render(
      <ProductMethods
        options={disabledOptions}
        label="Method"
        ctaLabel="Buy"
        defaultId="paymob"
      />,
    )

    const combobox = screen.getByRole("combobox") as HTMLSelectElement
    expect(combobox.value).toBe("paymob")
    expect(screen.getByText(/10 EGP/)).toBeTruthy()
    expect(screen.queryByRole("link")).toBeNull()
    expect((screen.getByRole("button", { name: "Buy" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("selecting/all-disabled state renders no link", () => {
    render(
      <ProductMethods
        options={allDisabledOptions}
        label="Method"
        ctaLabel="Buy"
      />,
    )

    expect(screen.queryByRole("link")).toBeNull()
    expect((screen.getByRole("button", { name: "Buy" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("disabled option cannot be selected and shows disabled CTA with reason/gap", () => {
    render(
      <ProductMethods
        options={[
          {
            id: "paymob",
            label: "Paymob",
            href: "/i",
            price: "10 EGP",
            disabled: true,
            reason: "مش متوفر",
            fundingGapMinor: 250,
          },
          { id: "coins", label: "Coins", href: "/k", price: "5", coinAmount: 5 },
        ]}
        label="Method"
        ctaLabel="Buy"
        defaultId="paymob"
      />,
    )

    const combobox = screen.getByRole("combobox") as HTMLSelectElement
    expect(combobox.value).toBe("paymob")
    expect((screen.getByRole("option", { name: "Paymob" }) as HTMLOptionElement).disabled).toBe(true)

    fireEvent.change(combobox, { target: { value: "coins" } })
    expect(combobox.value).toBe("coins")
    expect(screen.getByRole("link", { name: "Buy" }).getAttribute("href")).toBe("/k")

    fireEvent.change(combobox, { target: { value: "paymob" } })
    expect(combobox.value).toBe("paymob")
    expect(screen.queryByRole("link", { name: "Buy" })).toBeNull()
    expect((screen.getByRole("button", { name: "Buy" }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/مش متوفر/)).toBeTruthy()
    expect(screen.getByText(/2\.50 USDT/)).toBeTruthy()
  })

  it("a fully enabled set still renders the CTA link", () => {
    render(
      <ProductMethods
        options={options}
        label="Method"
        ctaLabel="Buy"
        defaultId="a"
      />,
    )

    const link = screen.getByRole("link", { name: "Buy" })
    expect(link.getAttribute("href")).toBe("/a")
  })
})
