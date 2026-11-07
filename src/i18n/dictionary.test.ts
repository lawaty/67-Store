import { describe, expect, it } from "vitest"
import { dictionaries } from "./dictionary"
import { ar } from "./messages/common"
import { ar as homeAr } from "./messages/home"
import { ar as topupAr } from "./messages/topup"
import { ar as orderAr } from "./messages/order"
import { ar as accountAr } from "./messages/account"
import { ar as managementAr } from "./messages/management"

const allAr = { ...ar, ...homeAr, ...topupAr, ...orderAr, ...accountAr, ...managementAr }

describe("i18n dictionaries", () => {
  it("have exactly the same key set for ar and en", () => {
    const arKeys = Object.keys(allAr).sort()
    const enKeys = Object.keys(dictionaries.en).sort()
    expect(arKeys).toEqual(enKeys)
  })

  it("have no empty values in either locale", () => {
    for (const [key, value] of Object.entries(dictionaries.ar)) {
      expect(value.trim().length, `empty value for ar key ${key}`).toBeGreaterThan(0)
    }
    for (const [key, value] of Object.entries(dictionaries.en)) {
      expect(value.trim().length, `empty value for en key ${key}`).toBeGreaterThan(0)
    }
  })
})
