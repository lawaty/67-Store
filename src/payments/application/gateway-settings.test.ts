import { describe, expect, it } from "vitest"
import type { SettingsRepository } from "@/shared/settings-repository"
import {
  DEFAULT_GATEWAY_SETTINGS,
  FULFILMENT_ENABLED_KEY,
  GATEWAY_CARD_KEY,
  GATEWAY_COINS_KEY,
  GATEWAY_CRYPTO_KEY,
  GATEWAY_WALLET_KEY,
  paymobMethodsEnabled,
  readGatewaySettings,
  writeGatewaySettings,
} from "./gateway-settings"

function memorySettings(initial: Record<string, string> = {}): SettingsRepository {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    async get(key: string) {
      return store.get(key) ?? null
    },
    async set(key: string, value: string) {
      store.set(key, value)
    },
    async delete(key: string) {
      store.delete(key)
    },
    async all() {
      return Object.fromEntries(store.entries())
    },
  }
}

describe("gateway-settings", () => {
  it("unset keys yield DEFAULT_GATEWAY_SETTINGS, including crypto === false and fulfilmentEnabled === true", async () => {
    const settings = memorySettings()
    const value = await readGatewaySettings(settings)
    expect(value).toEqual(DEFAULT_GATEWAY_SETTINGS)
    expect(value.crypto).toBe(false)
    expect(value.fulfilmentEnabled).toBe(true)
  })

  it('stored "true"/"false" values are read per key', async () => {
    const settings = memorySettings({
      [GATEWAY_CARD_KEY]: "false",
      [GATEWAY_WALLET_KEY]: "false",
      [GATEWAY_CRYPTO_KEY]: "true",
      [GATEWAY_COINS_KEY]: "false",
      [FULFILMENT_ENABLED_KEY]: "false",
    })
    expect(await readGatewaySettings(settings)).toEqual({
      card: false,
      wallet: false,
      crypto: true,
      coins: false,
      fulfilmentEnabled: false,
    })
  })

  it('an invalid stored value falls back to that key\'s default while other stored values still apply', async () => {
    const settings = memorySettings({
      [GATEWAY_CARD_KEY]: "false",
      [GATEWAY_WALLET_KEY]: "yes",
      [GATEWAY_CRYPTO_KEY]: "true",
      [GATEWAY_COINS_KEY]: "false",
      [FULFILMENT_ENABLED_KEY]: "maybe",
    })
    expect(await readGatewaySettings(settings)).toEqual({
      card: false,
      wallet: DEFAULT_GATEWAY_SETTINGS.wallet,
      crypto: true,
      coins: false,
      fulfilmentEnabled: DEFAULT_GATEWAY_SETTINGS.fulfilmentEnabled,
    })
  })

  it('writeGatewaySettings writes all five keys with "true"/"false" strings', async () => {
    const settings = memorySettings()
    await writeGatewaySettings(settings, {
      card: true,
      wallet: false,
      crypto: true,
      coins: false,
      fulfilmentEnabled: true,
    })
    expect(await settings.all()).toEqual({
      [GATEWAY_CARD_KEY]: "true",
      [GATEWAY_WALLET_KEY]: "false",
      [GATEWAY_CRYPTO_KEY]: "true",
      [GATEWAY_COINS_KEY]: "false",
      [FULFILMENT_ENABLED_KEY]: "true",
    })
  })

  it("a write → read round trip returns exactly the written value", async () => {
    const settings = memorySettings()
    const value = {
      card: false,
      wallet: true,
      crypto: true,
      coins: false,
      fulfilmentEnabled: false,
    }
    await writeGatewaySettings(settings, value)
    expect(await readGatewaySettings(settings)).toEqual(value)
  })

  it("paymobMethodsEnabled returns only card and wallet", async () => {
    const settings = memorySettings({
      [GATEWAY_CARD_KEY]: "false",
      [GATEWAY_WALLET_KEY]: "true",
      [GATEWAY_CRYPTO_KEY]: "true",
      [GATEWAY_COINS_KEY]: "false",
      [FULFILMENT_ENABLED_KEY]: "false",
    })
    expect(await paymobMethodsEnabled(settings)).toEqual({ card: false, wallet: true })
  })
})
