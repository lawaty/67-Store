/**
 * Reads and writes gateway enablement switches. Each key falls back to its own
 * default so a corrupt single value never corrupts the others.
 */
import type { SettingsRepository } from "@/shared/settings-repository"

export const GATEWAY_CARD_KEY = "gateway:card:enabled"
export const GATEWAY_WALLET_KEY = "gateway:wallet:enabled"
export const GATEWAY_CRYPTO_KEY = "gateway:crypto:enabled"
export const GATEWAY_COINS_KEY = "gateway:coins:enabled"
export const FULFILMENT_ENABLED_KEY = "fulfilment:enabled"

export type GatewaySettings = {
  readonly card: boolean
  readonly wallet: boolean
  readonly crypto: boolean
  readonly coins: boolean
  readonly fulfilmentEnabled: boolean
}

export const DEFAULT_GATEWAY_SETTINGS: GatewaySettings = {
  card: true,
  wallet: true,
  crypto: false,
  coins: true,
  fulfilmentEnabled: true,
}

export function parseSettingBoolean(raw: string | null | undefined, fallback: boolean): boolean {
  if (raw === null || raw === undefined) return fallback
  const normalized = raw.trim().toLowerCase()
  if (normalized === "true") return true
  if (normalized === "false") return false
  return fallback
}

export async function readGatewaySettings(settings: SettingsRepository): Promise<GatewaySettings> {
  const [cardRaw, walletRaw, cryptoRaw, coinsRaw, fulfilmentRaw] = await Promise.all([
    settings.get(GATEWAY_CARD_KEY),
    settings.get(GATEWAY_WALLET_KEY),
    settings.get(GATEWAY_CRYPTO_KEY),
    settings.get(GATEWAY_COINS_KEY),
    settings.get(FULFILMENT_ENABLED_KEY),
  ])
  return {
    card: parseSettingBoolean(cardRaw, DEFAULT_GATEWAY_SETTINGS.card),
    wallet: parseSettingBoolean(walletRaw, DEFAULT_GATEWAY_SETTINGS.wallet),
    crypto: parseSettingBoolean(cryptoRaw, DEFAULT_GATEWAY_SETTINGS.crypto),
    coins: parseSettingBoolean(coinsRaw, DEFAULT_GATEWAY_SETTINGS.coins),
    fulfilmentEnabled: parseSettingBoolean(fulfilmentRaw, DEFAULT_GATEWAY_SETTINGS.fulfilmentEnabled),
  }
}

export async function writeGatewaySettings(settings: SettingsRepository, value: GatewaySettings): Promise<void> {
  await Promise.all([
    settings.set(GATEWAY_CARD_KEY, String(value.card)),
    settings.set(GATEWAY_WALLET_KEY, String(value.wallet)),
    settings.set(GATEWAY_CRYPTO_KEY, String(value.crypto)),
    settings.set(GATEWAY_COINS_KEY, String(value.coins)),
    settings.set(FULFILMENT_ENABLED_KEY, String(value.fulfilmentEnabled)),
  ])
}

export async function paymobMethodsEnabled(settings: SettingsRepository): Promise<{ card: boolean; wallet: boolean }> {
  const { card, wallet } = await readGatewaySettings(settings)
  return { card, wallet }
}
