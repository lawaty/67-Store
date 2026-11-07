/**
 * Fetches G2Bulk game catalogues over HTTP and adapts them into the core
 * CatalogueSource boundary.
 */
import { CatalogueSource } from "@/catalogue"
import { DistributorError } from "@/fulfilment"
import { mapCatalogue } from "./catalogue-mapper"
import { FetchLike } from "@/shared/fetch"

export function createG2BulkCatalogue(options: { baseUrl: string; apiKey: string; fetch?: FetchLike }): CatalogueSource {
  const baseUrl = options.baseUrl.endsWith("/") ? options.baseUrl.slice(0, -1) : options.baseUrl
  const fetchImpl = options.fetch ?? (globalThis.fetch as FetchLike)
  const commonHeaders = {
    "Content-Type": "application/json",
    "X-API-Key": options.apiKey,
  }

  return async (code: string) => {
    const res = await fetchImpl(`${baseUrl}/v1/games/${encodeURIComponent(code)}/catalogue`, {
      method: "GET",
      headers: commonHeaders,
    })
    const body = await res.json()
    if (!res.ok) {
      throw new DistributorError(res.status, (typeof body === "object" && body !== null && typeof (body as any).message === "string") ? (body as any).message : `G2Bulk request failed with status ${res.status}`)
    }
    return mapCatalogue(code, body)
  }
}
