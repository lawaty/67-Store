/**
 * Server-only reader for the visitor's preferred default payment method, stored
 * in the `default_method` cookie (the same approach as the locale and theme cookies).
 */
import { cookies } from "next/headers"
import { isUrlMethod, type UrlMethod } from "@/app/urls"

export const PREFERRED_METHOD_COOKIE = "default_method"

export async function readPreferredMethod(): Promise<UrlMethod | null> {
  const value = (await cookies()).get(PREFERRED_METHOD_COOKIE)?.value
  return value !== undefined && isUrlMethod(value) ? value : null
}
