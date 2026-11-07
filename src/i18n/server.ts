/**
 * Reads the current locale from cookies for server components, falling back to the default when missing or invalid.
 */
import { cookies } from "next/headers"
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locale"

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get("locale")?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}
