/**
 * `GET/POST /api/admin/session` — checks admin auth or validates the admin
 * password and returns a session token.
 */
import { readEnv } from "@/env"
import { adminToken, isAdminRequest } from "@/api/auth"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function GET(request: Request): Promise<Response> {
  return isAdminRequest(request) ? json({ ok: true }) : failure("unauthorized", 401)
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const env = readEnv(process.env as Record<string, string | undefined>)
  if (env.adminPassword === "") return failure("auth", 500)
  if (text(body.password) !== env.adminPassword) return failure("invalid", 401)

  return json({ token: adminToken(env.adminPassword) })
}
