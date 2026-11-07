/**
 * `POST /api/admin/settings/p2p` — saves P2P observation window and sync
 * interval settings; requires the admin cookie via `isAdminRequest`.
 */

import { getContainer } from "@/api/container"
import { isAdminRequest } from "@/api/auth"
import { saveP2pSettings } from "@/api/admin"
import { failure, json } from "@/api/http"
import {
  DEFAULT_P2P_OUTLIER_SIGMA,
  MAX_P2P_OUTLIER_SIGMA,
  MAX_P2P_SYNC_INTERVAL_SECONDS,
  MAX_P2P_WINDOW_HOURS,
  MIN_P2P_OUTLIER_SIGMA,
  MIN_P2P_SYNC_INTERVAL_SECONDS,
  MIN_P2P_WINDOW_HOURS,
} from "@/shared/p2p-settings"

export async function POST(request: Request): Promise<Response> {
  if (!isAdminRequest(request)) return failure("unauthorized", 401)

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body === null) return failure("bad_request", 400)

  const windowHours = Number(body.windowHours)
  const syncIntervalSeconds = Number(body.syncIntervalSeconds)
  const outlierSigma = body.outlierSigma === undefined ? DEFAULT_P2P_OUTLIER_SIGMA : Number(body.outlierSigma)

  if (
    !Number.isSafeInteger(windowHours) ||
    windowHours < MIN_P2P_WINDOW_HOURS ||
    windowHours > MAX_P2P_WINDOW_HOURS ||
    !Number.isSafeInteger(syncIntervalSeconds) ||
    syncIntervalSeconds < MIN_P2P_SYNC_INTERVAL_SECONDS ||
    syncIntervalSeconds > MAX_P2P_SYNC_INTERVAL_SECONDS ||
    !Number.isSafeInteger(outlierSigma) ||
    outlierSigma < MIN_P2P_OUTLIER_SIGMA ||
    outlierSigma > MAX_P2P_OUTLIER_SIGMA
  ) {
    return failure("bad_request", 400)
  }

  try {
    const result = await saveP2pSettings(getContainer(), { windowHours, syncIntervalSeconds, outlierSigma })
    if (!result.ok) return failure(result.error, 400)
  } catch {
    return failure("bad_request", 400)
  }

  return json({ ok: true })
}
