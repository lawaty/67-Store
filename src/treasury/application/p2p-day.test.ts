import { describe, expect, it } from "vitest"
import { cairoDayKey } from "./p2p-day"

describe("cairoDayKey", () => {
  it("maps a winter UTC time to the next Cairo day when appropriate", () => {
    expect(cairoDayKey("2024-01-15T22:30:00.000Z")).toBe("2024-01-16")
  })

  it("maps a summer UTC time correctly under EEST", () => {
    expect(cairoDayKey("2024-07-15T21:30:00.000Z")).toBe("2024-07-16")
  })

  it("handles the DST-start boundary", () => {
    expect(cairoDayKey("2024-04-25T21:59:59.000Z")).toBe("2024-04-25")
    expect(cairoDayKey("2024-04-25T22:00:00.000Z")).toBe("2024-04-26")
  })

  it("keeps a midday UTC time on the same Cairo day", () => {
    expect(cairoDayKey("2024-01-15T12:00:00.000Z")).toBe("2024-01-15")
  })

  it("throws for an invalid ISO string", () => {
    expect(() => cairoDayKey("not-a-date")).toThrow()
  })
})
