// @vitest-environment jsdom
import React from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"
import { LiveStatus } from "./live-status"

const nav = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: nav.refresh }) }))

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

describe("LiveStatus", () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    nav.refresh.mockReset()
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("refreshes the page when the polled status changes", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(jsonResponse({ status: "DELIVERED" }))

    render(<LiveStatus token="3ada17ba" status="PAID" intervalMs={4000} />)
    expect(fetchMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/orders/3ada17ba?t=")
    expect(nav.refresh).toHaveBeenCalledTimes(1)
  })

  it("does not refresh when the status is unchanged", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(jsonResponse({ status: "PAID" }))

    render(<LiveStatus token="t1" status="PAID" intervalMs={4000} />)
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    await flush()

    expect(nav.refresh).not.toHaveBeenCalled()
  })

  it("stops polling on terminal statuses", async () => {
    vi.useFakeTimers()
    render(<LiveStatus token="t1" status="DELIVERED" intervalMs={4000} />)

    await act(async () => {
      vi.advanceTimersByTime(20_000)
    })
    await flush()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(nav.refresh).not.toHaveBeenCalled()
  })

  it("keeps polling after a network failure", async () => {
    vi.useFakeTimers()
    fetchMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(jsonResponse({ status: "DELIVERED" }))

    render(<LiveStatus token="t1" status="FULFILLING" intervalMs={4000} />)

    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    await flush()
    expect(nav.refresh).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(nav.refresh).toHaveBeenCalledTimes(1)
  })

  it("ignores non-ok responses without refreshing", async () => {
    vi.useFakeTimers()
    fetchMock.mockResolvedValue(jsonResponse({ error: "not_found" }, 404))

    render(<LiveStatus token="t1" status="PAID" intervalMs={4000} />)
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    await flush()

    expect(nav.refresh).not.toHaveBeenCalled()
  })
})
