/**
 * Server-side helper that builds an API client with the resolved origin and the
 * current request's session cookies.
 */
import { cookies } from "next/headers"
import { createApiClient, type ApiClient } from "./api"

export function apiOrigin(): string {
  return process.env.API_ORIGIN ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`
}

export async function serverApi(): Promise<ApiClient> {
  return createApiClient({ origin: apiOrigin(), cookie: (await cookies()).toString() })
}
