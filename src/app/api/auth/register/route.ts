/**
 * `POST /api/auth/register` — creates an account (topup client or reseller) and
 * returns the auth result; public endpoint requiring configured auth secret.
 */

import { randomUUID } from "node:crypto"
import { getContainer } from "@/api/container"
import { readEnv } from "@/env"
import { register } from "@/api/auth-account"
import { failure, json } from "@/api/http"

function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const secret = readEnv(process.env as Record<string, string | undefined>).authSecret
  if (secret === "") return failure("auth", 500)

  const outcome = await register(
    getContainer(),
    {
      email: text(body.email),
      password: text(body.password),
      playerUserId: text(body.playerUserId),
      playerServerId: text(body.playerServerId),
      locale: text(body.locale),
    },
    secret,
    { newId: randomUUID },
  )

  return outcome.ok ? json(outcome.result) : failure(outcome.error, 400)
}
