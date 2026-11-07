/**
 * Reads and writes the storefront default payment method, validating against
 * allowed methods and falling back to instapay when unset or invalid.
 */
import type { SettingsRepository } from "@/shared/settings-repository"

export const STOREFRONT_METHODS = ["instapay", "crypto", "coins"] as const
export type StorefrontMethod = (typeof STOREFRONT_METHODS)[number]
export const STOREFRONT_DEFAULT_METHOD_KEY = "storefront:default_method"
export const DEFAULT_STOREFRONT_METHOD: StorefrontMethod = "instapay"

export function isStorefrontMethod(value: string): value is StorefrontMethod {
  return (STOREFRONT_METHODS as readonly string[]).includes(value)
}

export async function readStorefrontDefaultMethod(settings: SettingsRepository): Promise<StorefrontMethod> {
  const stored = await settings.get(STOREFRONT_DEFAULT_METHOD_KEY)
  return stored !== null && isStorefrontMethod(stored) ? stored : DEFAULT_STOREFRONT_METHOD
}

export async function writeStorefrontDefaultMethod(settings: SettingsRepository, value: StorefrontMethod): Promise<void> {
  await settings.set(STOREFRONT_DEFAULT_METHOD_KEY, value)
}
