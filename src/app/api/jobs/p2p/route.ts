/**
 * `POST /api/jobs/p2p` — refreshes the Binance P2P USDT/EGP rate; invoked by
 * the external scheduler (cron/systemd timer) with `x-jobs-secret`. The refresh
 * cadence is the P2P sync interval setting.
 */

import { timingSafeEqual } from "node:crypto"
import { getContainer, readP2pToday } from "@/api/container"
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

  const rate = await getContainer().p2pRate.read()
  const snapshot = await readP2pToday(new Date().toISOString())
  return Response.json(
    {
      ok: rate !== null,
      fetchedAt: rate?.fetchedAt ?? null,
      source: rate?.source ?? null,
      stale: rate?.stale ?? null,
      egpPerUsdtMinor: rate?.egpPerUsdtMinor ?? null,
      today: snapshot
        ? {
            minEgpPerUsdtMinor: snapshot.snapshot.minEgpPerUsdtMinor,
            maxEgpPerUsdtMinor: snapshot.snapshot.maxEgpPerUsdtMinor,
            avgEgpPerUsdtMinor: snapshot.snapshot.avgEgpPerUsdtMinor,
            currentEgpPerUsdtMinor: snapshot.snapshot.currentEgpPerUsdtMinor,
          }
        : null,
    },
    { status: 200 },
  )
}
