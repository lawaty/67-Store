/**
 * Merges message modules into locale dictionaries and exports `MessageKey`/`Messages` types. `t(locale, key, vars?)` resolves keys synchronously with fallback to Arabic.
 */
import { ar as commonAr, en as commonEn } from "./messages/common"
import { ar as homeAr, en as homeEn } from "./messages/home"
import { ar as topupAr, en as topupEn } from "./messages/topup"
import { ar as orderAr, en as orderEn } from "./messages/order"
import { ar as accountAr, en as accountEn } from "./messages/account"
import { ar as managementAr, en as managementEn } from "./messages/management"
import { ar as legalAr, en as legalEn } from "./messages/legal"
import type { Locale } from "./locale"

const ar = {
  ...commonAr,
  ...homeAr,
  ...topupAr,
  ...orderAr,
  ...accountAr,
  ...managementAr,
  ...legalAr,
} as const

const en: Record<keyof typeof ar, string> = {
  ...commonEn,
  ...homeEn,
  ...topupEn,
  ...orderEn,
  ...accountEn,
  ...managementEn,
  ...legalEn,
}

export const dictionaries = { ar, en } as const

export type MessageKey = keyof typeof ar
export type Messages = Record<MessageKey, string>

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const dict = dictionaries[locale] as Record<string, string>
  let value = dict[key] ?? (dictionaries.ar as Record<string, string>)[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
    }
  }
  return value
}
