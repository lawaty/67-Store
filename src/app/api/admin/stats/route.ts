/**
 * `GET /api/admin/stats` — returns the four pinned sidebar stats; requires the
 * admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { readAdminStats } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  return json(await readAdminStats(getContainer()))
}
