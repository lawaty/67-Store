/**
 * `GET/POST /api/admin/settings` — reads or updates store settings (pricing, rates,
 * defaults); requires the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { readSettings, saveSettings } from "@/api/admin"
import { failure, json } from "@/api/http"

export async function GET(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)
  return json(await readSettings(getContainer()))
}

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const result = await saveSettings(getContainer(), {
    egpRate: Number(body.egpRate),
    coinIndexCapBps: Number(body.coinIndexCapBps),
    p2pRateEgp: body.p2pRateEgp as any,
    defaultMethod: typeof body.defaultMethod === "string" ? body.defaultMethod : undefined,
  })

  return result.ok ? json({ ok: true }) : failure(result.error, 400)
}
