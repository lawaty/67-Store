/**
 * Resolves the supported locale, its cookie name, and the default locale, plus helpers for locale checks and HTML direction/lang.
 */
export type Locale = "ar" | "en"
export const LOCALE_COOKIE = "locale"
export const DEFAULT_LOCALE: Locale = "ar"

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ar" || value === "en"
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr"
}

export function htmlLang(locale: Locale): string {
  return locale === "ar" ? "ar" : "en"
}
