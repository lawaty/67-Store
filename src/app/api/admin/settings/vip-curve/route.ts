/**
 * `POST /api/admin/settings/vip-curve` — saves the VIP level set for MLBB;
 * requires the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { saveVipLevels } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  if (!Array.isArray(body.levels)) return failure("bad_request", 400)

  const result = await saveVipLevels(getContainer(), { levels: body.levels })

  return result.ok ? json({ ok: true }) : failure(result.error, 400)
}
