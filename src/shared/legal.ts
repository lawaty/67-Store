/**
 * Every legal surface (pages, footer, checkout consent) must read the operator
 * identity, SLA and policy version from this module so they never drift.
 */
import type { CurrencyCode } from "./money"

export const POLICY_VERSION = "2026-11-11"

export const LEGAL_ROUTES = {
  terms: "/terms",
  privacy: "/privacy",
  refund: "/refund-policy",
  delivery: "/delivery",
  cookies: "/cookies",
  contact: "/contact",
} as const

export type LegalRouteKey = keyof typeof LEGAL_ROUTES

export const LEGAL_FACTS = {
  operatorName: "67 Store",
  country: "Egypt",
  supportEmail: "support@67-store.online",
  contactEmail: "ssixsevven1@gmail.com",
  whatsapp: "+20 10 4139 1513",
  phone: null as string | null,
  supportHours: "24/7",
  firstResponseHours: 24,
  refundWindowDays: 7,
  deliverySlaMinutes: 15,
  currency: "EGP" as CurrencyCode,
  policyVersion: POLICY_VERSION,
}
