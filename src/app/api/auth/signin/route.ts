/**
 * `POST /api/auth/signin` — authenticates credentials and returns a session;
 * public endpoint requiring configured auth secret.
 */

import { getContainer } from "@/api/container"
import { readEnv } from "@/env"
import { signIn } from "@/api/auth-account"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const secret = readEnv(process.env as Record<string, string | undefined>).authSecret
  if (secret === "") return failure("auth", 500)

  const result = await signIn(
    getContainer(),
    { email: text(body.email), password: text(body.password) },
    secret,
  )

  return result === null ? failure("invalid", 401) : json(result)
}
