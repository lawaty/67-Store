// @vitest-environment jsdom
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { SidebarStats } from "./sidebar-stats"
import type { AdminStatsDto } from "@/api/contracts/admin"

const nav = vi.hoisted(() => ({ pathname: "/management" }))
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }))

const sample: AdminStatsDto = {
  balanceUsdtMinor: 123456,
  p2pEgpPerUsdtMinor: 5123,
  wacEgpMinor: 4987,
  availableUsdtMinor: 4567,
  recordedUsdtMinor: 70000,
  reservedUsdtMinor: 65433,
  balanceError: false,
  updatedAt: "2026-11-05T10:30:00.000Z",
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("SidebarStats", () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    nav.pathname = "/management"
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("initial loading renders skeletons", async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}))
    const { container } = render(<SidebarStats />)
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0)
    expect(screen.queryByText("إجمالي الخزينة")).toBeNull()
  })

  it("a successful response renders the four labels and formatted values", async () => {
    fetchMock.mockResolvedValue(jsonResponse(sample))
    render(<SidebarStats />)
    await flush()

    expect(screen.getByText("إجمالي الخزينة")).toBeTruthy()
    expect(screen.getByText("سعر السوق")).toBeTruthy()
    expect(screen.getByText("WAC")).toBeTruthy()
    expect(screen.getByText("المتاح")).toBeTruthy()

    expect(screen.getByText("1,234.56")).toBeTruthy()
    expect(screen.getByText("51.23 ج.م")).toBeTruthy()
    expect(screen.getByText("49.87 ج.م")).toBeTruthy()
    expect(screen.getAllByText("45.67").length).toBeGreaterThan(0)

    // Compact partition legend in the desktop layout.
    expect(screen.getByText("محجوز")).toBeTruthy()
    expect(screen.getByText("متاح")).toBeTruthy()
  })

  it("a 401 response renders nothing", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
    const { container } = render(<SidebarStats />)
    await flush()
    expect(container.firstChild).toBeNull()
  })

  it("a negative available value gets the danger class", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...sample, availableUsdtMinor: -123 }))
    const { container } = render(<SidebarStats />)
    await flush()
    expect(screen.getByText("المتاح")).toBeTruthy()
    expect(screen.getAllByText("-1.23").length).toBeGreaterThan(0)
    const danger = container.querySelector(".text-danger")
    expect(danger).not.toBeNull()
    expect(danger?.textContent).toContain("-1.23")
  })

  it("fetches on mount", async () => {
    fetchMock.mockResolvedValue(jsonResponse(sample))
    render(<SidebarStats />)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("requests a cache-busted URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse(sample))
    render(<SidebarStats />)
    await flush()
    const url = fetchMock.mock.calls[0][0] as string
    expect(url.startsWith("/api/admin/stats?t=")).toBe(true)
    expect(url).toMatch(/^\/api\/admin\/stats\?t=\d+$/)
  })

  it("refetches when the pathname changes and the component re-renders", async () => {
    fetchMock.mockResolvedValue(jsonResponse(sample))
    const { rerender } = render(<SidebarStats />)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    nav.pathname = "/management/treasury"
    rerender(<SidebarStats />)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("refetches when the window regains focus", async () => {
    fetchMock.mockResolvedValue(jsonResponse(sample))
    render(<SidebarStats />)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      window.dispatchEvent(new Event("focus"))
    })
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("refetches on the 30s polling interval", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(jsonResponse(sample))
    render(<SidebarStats />)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does not fetch after unmount", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(jsonResponse(sample))
    const { unmount } = render(<SidebarStats />)
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    unmount()
    await act(async () => {
      vi.advanceTimersByTime(60_000)
      window.dispatchEvent(new Event("focus"))
    })
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
