/**
 * POST /api/jobs/sync runs the MLBB catalogue sync job. Requires a valid
 * `x-jobs-secret`; returns 503 when unconfigured or 401 on a bad secret.
 */
import { timingSafeEqual } from "node:crypto"
import { getContainer } from "@/api/container"
import { readEnv } from "@/env"

export async function POST(request: Request): Promise<Response> {
  const env = readEnv(process.env as Record<string, string | undefined>)

  if (env.jobsSecret === "") {
    return new Response("jobs secret not configured", { status: 503 })
  }

  const provided = request.headers.get("x-jobs-secret") ?? ""
  const a = Buffer.from(provided)
  const b = Buffer.from(env.jobsSecret)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response(null, { status: 401 })
  }

  const container = getContainer()
  const result = await container.syncCatalogue("mlbb")
  return Response.json(result, { status: 200 })
}
