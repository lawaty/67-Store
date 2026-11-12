import { describe, expect, it } from "vitest"
import {
  LEGAL_FACTS,
  LEGAL_ROUTES,
  POLICY_VERSION,
  type LegalRouteKey,
} from "./legal"

describe("legal", () => {
  it("LEGAL_ROUTES has exactly the six keys and every value starts with /", () => {
    const keys = Object.keys(LEGAL_ROUTES).sort()
    expect(keys).toEqual(["contact", "cookies", "delivery", "privacy", "refund", "terms"])
    for (const value of Object.values(LEGAL_ROUTES)) {
      expect(value.startsWith("/")).toBe(true)
    }
  })

  it("LEGAL_FACTS core fields are correct", () => {
    expect(LEGAL_FACTS.supportEmail).toBe("support@67-store.online")
    expect(LEGAL_FACTS.country).toBe("Egypt")
    expect(LEGAL_FACTS.refundWindowDays).toBe(7)
    expect(LEGAL_FACTS.deliverySlaMinutes).toBe(15)
    expect(LEGAL_FACTS.refundWindowDays).toBeGreaterThan(0)
    expect(LEGAL_FACTS.deliverySlaMinutes).toBeGreaterThan(0)
  })

  it("contact fields are present and non-empty", () => {
    expect(LEGAL_FACTS.contactEmail.length).toBeGreaterThan(0)
    expect(LEGAL_FACTS.whatsapp.length).toBeGreaterThan(0)
  })

  it("policy version is consistent and phone is null", () => {
    expect(LEGAL_FACTS.policyVersion).toBe(POLICY_VERSION)
    expect(LEGAL_FACTS.phone).toBeNull()
  })

  it("every other string/boolean/number field of LEGAL_FACTS is non-empty", () => {
    for (const [key, value] of Object.entries(LEGAL_FACTS)) {
      if (key === "phone" || key === "policyVersion") continue
      if (typeof value === "string") {
        expect(value.length, `${key} should be non-empty`).toBeGreaterThan(0)
      } else if (typeof value === "number") {
        expect(value, `${key} should be non-zero`).not.toBe(0)
      } else if (typeof value === "boolean") {
        expect(typeof value).toBe("boolean")
      }
    }
  })
})
