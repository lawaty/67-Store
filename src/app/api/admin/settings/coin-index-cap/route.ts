/**
 * `POST /api/admin/settings/coin-index-cap` — saves the coin-index change cap;
 * requires the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { saveCoinIndexCap } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const cap = Number(body.coinIndexCapBps)
  if (!Number.isSafeInteger(cap) || cap < 0 || cap > 10_000) {
    return failure("bad_request", 400)
  }

  try {
    const result = await saveCoinIndexCap(getContainer(), cap)
    if (!result.ok) return failure(result.error, 400)
  } catch {
    return failure("bad_request", 400)
  }

  return json({ ok: true })
}
