// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup, fireEvent } from "@testing-library/react"

import { NavigationProgress } from "./navigation-progress"

const nav = vi.hoisted(() => ({ pathname: "/" }))
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }))

beforeEach(() => {
  nav.pathname = "/"
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
})

describe("NavigationProgress", () => {
  it("adds is-loading when an internal link is clicked", () => {
    const { container } = render(<NavigationProgress />)
    document.body.insertAdjacentHTML("beforeend", '<a href="/products">Products</a>')
    const anchor = document.body.querySelector("a") as HTMLAnchorElement
    fireEvent.click(anchor)
    const bar = container.querySelector(".nav-progress")
    expect(bar?.classList.contains("is-loading")).toBe(true)
  })

  it("does not add is-loading for external, hash-only or same-path links", () => {
    const { container } = render(<NavigationProgress />)
    const bar = container.querySelector(".nav-progress")

    document.body.insertAdjacentHTML("beforeend", '<a href="https://example.com">External</a>')
    fireEvent.click(document.body.querySelector('a[href="https://example.com"]') as HTMLAnchorElement)
    expect(bar?.classList.contains("is-loading")).toBe(false)

    document.body.insertAdjacentHTML("beforeend", '<a href="#x">Hash</a>')
    fireEvent.click(document.body.querySelector('a[href="#x"]') as HTMLAnchorElement)
    expect(bar?.classList.contains("is-loading")).toBe(false)

    document.body.insertAdjacentHTML("beforeend", '<a href="/">Home</a>')
    fireEvent.click(document.body.querySelector('a[href="/"]') as HTMLAnchorElement)
    expect(bar?.classList.contains("is-loading")).toBe(false)
  })

  it("has is-done after the pathname changes and the component re-renders", () => {
    const { container, rerender } = render(<NavigationProgress />)
    document.body.insertAdjacentHTML("beforeend", '<a href="/products">Products</a>')
    fireEvent.click(document.body.querySelector("a") as HTMLAnchorElement)
    const bar = container.querySelector(".nav-progress")
    expect(bar?.classList.contains("is-loading")).toBe(true)

    nav.pathname = "/products"
    rerender(<NavigationProgress />)
    expect(container.querySelector(".nav-progress")?.classList.contains("is-done")).toBe(true)
  })
})
