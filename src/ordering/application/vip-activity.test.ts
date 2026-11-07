import { describe, expect, it, vi } from "vitest"
import { VIP_WINDOW_DAYS, vipWindowStart, readQualifyingVolume } from "./vip-activity"

const now = new Date("2026-11-06T00:00:00.000Z")

describe("vip-activity", () => {
  it("defines a 30-day window", () => {
    expect(VIP_WINDOW_DAYS).toBe(30)
  })

  it("computes window start as now minus 30×24h", () => {
    expect(vipWindowStart(now).toISOString()).toBe("2026-10-07T00:00:00.000Z")
    expect(vipWindowStart(now).getTime()).toBe(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  })

  it("reads qualifying volume since the window start for a client", async () => {
    const sumQualifiedVolumeSince = vi.fn(async () => 1234)
    const activity = { sumQualifiedVolumeSince }
    await expect(readQualifyingVolume(activity, "c1", now)).resolves.toBe(1234)
    expect(sumQualifiedVolumeSince).toHaveBeenCalledWith("c1", new Date("2026-10-07T00:00:00.000Z"))
  })

  it("returns 0 and does not query for a null client", async () => {
    const sumQualifiedVolumeSince = vi.fn(async () => 999)
    await expect(readQualifyingVolume({ sumQualifiedVolumeSince }, null, now)).resolves.toBe(0)
    expect(sumQualifiedVolumeSince).not.toHaveBeenCalled()
  })

  it("treats non-finite and negative results as 0", async () => {
    await expect(readQualifyingVolume({ sumQualifiedVolumeSince: async () => -5 }, "c1", now)).resolves.toBe(0)
    await expect(readQualifyingVolume({ sumQualifiedVolumeSince: async () => Number.NaN }, "c1", now)).resolves.toBe(0)
    await expect(readQualifyingVolume({ sumQualifiedVolumeSince: async () => Number.POSITIVE_INFINITY }, "c1", now)).resolves.toBe(0)
  })

  it("propagates a thrown port error", async () => {
    const boom = new Error("boom")
    await expect(readQualifyingVolume({ sumQualifiedVolumeSince: async () => { throw boom } }, "c1", now)).rejects.toBe(boom)
  })
})
