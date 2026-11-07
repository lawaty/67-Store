/**
 * `GET /api/admin/dashboard` — returns the management read model for the
 * treasury, P2P, performance and projections; requires the admin cookie.
 */
import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { readDashboard } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  return json(await readDashboard(getContainer()))
}
