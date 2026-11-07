/**
 * Centralises route paths and payment method mapping/slug helpers for store URLs.
 */
export const METHODS = ["instapay", "crypto", "coins"] as const

export type UrlMethod = (typeof METHODS)[number]

export type FormMethod = "egp" | "usdt" | "coins"

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function methodToForm(method: UrlMethod): FormMethod {
  if (method === "instapay") return "egp"
  if (method === "crypto") return "usdt"
  return "coins"
}

export function formToMethod(method: string): UrlMethod {
  if (method === "egp") return "instapay"
  if (method === "usdt") return "crypto"
  return "coins"
}

export function isUrlMethod(value: string): value is UrlMethod {
  return (METHODS as readonly string[]).includes(value)
}

export function topupPath(productName: string, method: UrlMethod): string {
  return `/mlbb/${slugify(productName)}/${method}`
}
