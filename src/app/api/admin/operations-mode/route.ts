/**
 * `POST /api/admin/operations-mode` — switches the persisted live/sandbox
 * operations mode; requires the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { failure, json } from "@/api/http"
import { parseOperationsMode, writeOperationsMode } from "@/shared/operations-mode"

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const mode = parseOperationsMode(typeof body.mode === "string" ? body.mode : null)
  if (mode === null) return failure("bad_request", 400)

  await writeOperationsMode(getContainer().settings, mode)
  return json({ ok: true, mode })
}
