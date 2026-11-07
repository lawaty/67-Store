/**
 * Translates G2Bulk player check, order, and balance HTTP APIs into the core
 * Distributor port with normalized statuses and errors.
 */
import { Distributor, DistributorError, DistributorOrder, PlayerCheck } from "@/fulfilment"
import { Player } from "@/ordering"
import { Product } from "@/catalogue"
import { idempotencyKey } from "./idempotency"
import { usdToMinor } from "./catalogue-mapper"

import { FetchLike } from "@/shared/fetch"

const STATUSES = new Set(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])

function normalizeBaseUrl(baseUrl: string): string {
  if (baseUrl.endsWith("/")) {
    return baseUrl.slice(0, -1)
  }
  return baseUrl
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>
    if (typeof b.message === "string") {
      return b.message
    }
  }
  return undefined
}

function unwrapData(body: unknown): unknown {
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>
    if (typeof b.data === "object" && b.data !== null) {
      return b.data
    }
  }
  return body
}

function mapOrderPayload(payload: unknown, httpStatus: number): DistributorOrder {
  const unwrapped = unwrapData(payload)
  if (typeof unwrapped !== "object" || unwrapped === null) {
    throw new DistributorError(httpStatus, `Unknown distributor status: ${String((unwrapped as any)?.status)}`)
  }
  const p = unwrapped as Record<string, unknown>
  const rawOrderId = p.order_id !== undefined ? p.order_id : p.id
  const distributorOrderId =
    typeof rawOrderId === "string" ? rawOrderId : (typeof rawOrderId === "number" ? String(rawOrderId) : "")
  let statusRaw = p.status
  if (typeof statusRaw === "string") {
    const upper = statusRaw.toUpperCase()
    if (STATUSES.has(upper)) {
      return { distributorOrderId, status: upper as DistributorOrder["status"] }
    }
    throw new DistributorError(httpStatus, `Unknown distributor status: ${statusRaw}`)
  }
  throw new DistributorError(httpStatus, `Unknown distributor status: ${String(statusRaw)}`)
}

export { idempotencyKey, deriveIdempotencyKey, g2bulkIdempotencyKey, idempotencyKeyFromOrderId, deterministicUuid, uuidFromOrderId } from "./idempotency"

export function createG2Bulk(options: { baseUrl: string; apiKey: string; fetch?: FetchLike }): Distributor {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const fetchImpl = options.fetch ?? (globalThis.fetch as FetchLike)
  const commonHeaders = {
    "Content-Type": "application/json",
    "X-API-Key": options.apiKey,
  }

  return {
    async checkPlayer(input: { game: string; player: Player }): Promise<PlayerCheck> {
      const res = await fetchImpl(`${baseUrl}/v1/games/checkPlayerId`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ game: input.game, user_id: input.player.userId, server_id: input.player.serverId }),
      })
      const body = await res.json()
      if (!res.ok) {
        if (res.status === 410) {
          throw new DistributorError(410, extractMessage(body) ?? "G2Bulk request failed with status 410")
        }
        throw new DistributorError(res.status, extractMessage(body) ?? `G2Bulk request failed with status ${res.status}`)
      }
      const unwrapped = unwrapData(body)
      if (typeof unwrapped !== "object" || unwrapped === null) {
        return { valid: false, name: null }
      }
      const p = unwrapped as Record<string, unknown>
      const name = typeof p.name === "string" ? p.name : null
      const valid = p.valid === "valid" && name !== null && name !== ""
      return { valid, name }
    },

    async placeOrder(input: { orderId: string; game: string; product: Product; player: Player }): Promise<DistributorOrder> {
      const res = await fetchImpl(`${baseUrl}/v1/games/${encodeURIComponent(input.game)}/order`, {
        method: "POST",
        headers: { ...commonHeaders, "X-Idempotency-Key": idempotencyKey(input.orderId) },
        body: JSON.stringify({
          catalogue_name: input.product.name,
          player_id: input.player.userId,
          server_id: input.player.serverId,
          remark: input.orderId,
        }),
      })
      if (res.status === 410) {
        const body = await res.json()
        return { distributorOrderId: "", status: "FAILED" }
      }
      const body = await res.json()
      if (!res.ok) {
        throw new DistributorError(res.status, extractMessage(body) ?? `G2Bulk request failed with status ${res.status}`)
      }
      return mapOrderPayload(body, res.status)
    },

    async getOrder(input: { distributorOrderId: string; game: string }): Promise<DistributorOrder> {
      const distributorOrderId = input.distributorOrderId
      const res = await fetchImpl(`${baseUrl}/v1/games/order/status`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ order_id: Number(distributorOrderId), game: input.game }),
      })
      if (res.status === 410) {
        const body = await res.json()
        return { distributorOrderId, status: "FAILED" }
      }
      const body = await res.json()
      if (!res.ok) {
        throw new DistributorError(res.status, extractMessage(body) ?? `G2Bulk request failed with status ${res.status}`)
      }
      return mapOrderPayload(body, res.status)
    },

    async getBalance(): Promise<{ readonly balanceMinor: number }> {
      const res = await fetchImpl(`${baseUrl}/v1/getMe`, {
        method: "GET",
        headers: commonHeaders,
      })
      const body = await res.json()
      if (!res.ok) {
        throw new DistributorError(res.status, extractMessage(body) ?? `G2Bulk request failed with status ${res.status}`)
      }
      const unwrapped = unwrapData(body)
      const p = (typeof unwrapped === "object" && unwrapped !== null ? unwrapped : body) as Record<string, unknown>
      const balance = typeof p.balance === "number" ? p.balance : Number(p.balance)
      return { balanceMinor: usdToMinor(balance) }
    },
  }
}
