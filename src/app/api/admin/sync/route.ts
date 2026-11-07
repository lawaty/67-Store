/**
 * `POST /api/admin/sync` — triggers a catalogue sync; requires the admin cookie
 * via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { syncCatalogue } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  await syncCatalogue(getContainer())
  return json({ ok: true })
}
