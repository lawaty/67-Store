// @vitest-environment jsdom
import React from "react"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { PricingControls } from "./pricing-controls"

afterEach(() => cleanup())

describe("PricingControls", () => {
  it("renders exactly one link to the VIP levels page and no markup or VIP-curve dialog/button", () => {
    const { container } = render(<PricingControls />)

    const links = container.querySelectorAll("a")
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute("href")).toBe("/management/levels")
    expect(links[0].textContent?.trim()).toBe("مستويات VIP")
    expect(links[0].className).toContain("btn")

    expect(container.querySelectorAll("button")).toHaveLength(0)
    expect(container.querySelectorAll("dialog")).toHaveLength(0)
    expect(container.textContent).not.toContain("الهامش الأساسي")
    expect(container.textContent).not.toContain("منحنى VIP")
  })
})
