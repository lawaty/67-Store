/**
 * `GET /api/admin/treasury` — returns the treasury dashboard read model; requires
 * the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { readTreasuryDashboard } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  return json(await readTreasuryDashboard(getContainer()))
}
