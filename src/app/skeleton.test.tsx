// @vitest-environment jsdom

import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import {
  Skeleton,
  SkeletonText,
  SkeletonStatCards,
  SkeletonTable,
  SkeletonCards,
  Spinner,
  LoadingRegion,
} from "./skeleton"

afterEach(() => {
  cleanup()
})

describe("Skeleton", () => {
  it("renders an element that is aria-hidden and carries the skeleton class", () => {
    const { container } = render(<Skeleton />)
    const el = container.firstElementChild
    expect(el).toBeTruthy()
    expect(el!.getAttribute("aria-hidden")).toBe("true")
    expect(el!.className).toContain("skeleton")
  })
})

describe("SkeletonText", () => {
  it("renders exactly 3 skeleton elements and an aria-hidden wrapper for lines={3}", () => {
    const { container } = render(<SkeletonText lines={3} />)
    const wrapper = container.firstElementChild
    expect(wrapper).toBeTruthy()
    expect(wrapper!.getAttribute("aria-hidden")).toBe("true")
    const skeletons = wrapper!.querySelectorAll(".skeleton")
    expect(skeletons.length).toBe(3)
  })
})

describe("SkeletonStatCards", () => {
  it("renders 2 card blocks for count={2}", () => {
    const { container } = render(<SkeletonStatCards count={2} />)
    const grid = container.firstElementChild
    expect(grid).toBeTruthy()
    expect(grid!.children.length).toBe(2)
  })
})

describe("SkeletonTable", () => {
  it("renders desktop and cards blocks and has exactly 6 desktop body rows", () => {
    const { container } = render(<SkeletonTable cols={4} rows={6} />)
    expect(container.querySelector(".table-desktop")).toBeTruthy()
    expect(container.querySelector(".table-cards")).toBeTruthy()
    const desktop = container.querySelector(".table-desktop")!
    // desktop children: [header, body container]
    const body = desktop.children[1]
    expect(body).toBeTruthy()
    expect(body.children.length).toBe(6)
  })
})

describe("SkeletonCards", () => {
  it("renders 3 card blocks for count={3}", () => {
    const { container } = render(<SkeletonCards count={3} />)
    const grid = container.firstElementChild
    expect(grid).toBeTruthy()
    expect(grid!.children.length).toBe(3)
  })
})

describe("Spinner", () => {
  it("is aria-hidden and has animate-spin class", () => {
    const { container } = render(<Spinner />)
    const el = container.firstElementChild
    expect(el).toBeTruthy()
    expect(el!.getAttribute("aria-hidden")).toBe("true")
    expect(el!.className).toContain("animate-spin")
  })
})

describe("LoadingRegion", () => {
  it("has status role, polite live region, aria-busy, and renders children", () => {
    const { container } = render(
      <LoadingRegion>
        <span data-child="yes">Loading content</span>
      </LoadingRegion>,
    )
    const region = container.firstElementChild
    expect(region).toBeTruthy()
    expect(region!.getAttribute("role")).toBe("status")
    expect(region!.getAttribute("aria-live")).toBe("polite")
    expect(region!.getAttribute("aria-busy")).toBe("true")
    expect(region!.querySelector('[data-child="yes"]')).toBeTruthy()
    expect(region!.textContent).toContain("Loading content")
  })
})
