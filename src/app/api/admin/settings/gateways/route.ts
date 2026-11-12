/**
 * `GET|POST /api/admin/settings/gateways` — reads and saves gateway enablement switches;
 * requires the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { readAdminGateways, saveAdminGateways, type AdminGatewaySettingsDto } from "@/api/admin"
import { failure, json } from "@/api/http"

function isGatewaySettings(input: unknown): input is AdminGatewaySettingsDto {
  if (input === null || typeof input !== "object") return false
  const record = input as Record<string, unknown>
  return (
    typeof record.card === "boolean" &&
    typeof record.wallet === "boolean" &&
    typeof record.crypto === "boolean" &&
    typeof record.coins === "boolean" &&
    typeof record.fulfilmentEnabled === "boolean"
  )
}

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  return json(await readAdminGateways(getContainer()))
}

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as unknown
  if (body === null) return failure("bad_request", 400)
  if (!isGatewaySettings(body)) return failure("bad_request", 400)

  const result = await saveAdminGateways(getContainer(), body)
  if (!result.ok) return failure(result.error, 400)

  return json({ ok: true })
}
