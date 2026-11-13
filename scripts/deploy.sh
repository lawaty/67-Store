#!/usr/bin/env bash
# Safe deploy for 67-store.
# Builds in a staging copy (never into the live app/.next), swaps .next only
# after a successful build, then restarts PM2 with backoff and health-checks.
# On failure it restores the previous .next and restarts the old build.
set -euo pipefail

APP_DIR="${APP_DIR:-/home/67-store.online/app}"
PM2_APP="${PM2_APP:-67-store}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3100}"
HEALTH_PATHS="${HEALTH_PATHS:-/ /api/storefront}"
LOCK_FILE="${LOCK_FILE:-/tmp/67-store-deploy.lock}"

if [ -z "${PM2_HOME:-}" ]; then
  export PM2_HOME="/root/.pm2"
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "another deploy is already running" >&2
  exit 1
fi

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  echo "node_modules missing in $APP_DIR" >&2
  exit 1
fi
if [ ! -f ecosystem.config.cjs ]; then
  echo "ecosystem.config.cjs missing in $APP_DIR" >&2
  exit 1
fi

STAGE=""
SWAPPED=0
SUCCESS=0
OLD=""
INCOMING=""

rollback() {
  trap - EXIT
  if [ "$SWAPPED" = "1" ] && [ "$SUCCESS" = "0" ]; then
    SWAPPED=0
    echo "deploy failed; rolling back to previous build" >&2
    if [ -n "$OLD" ] && [ -d "$OLD" ]; then
      if [ -d "$APP_DIR/.next" ]; then
        local failed="$APP_DIR/.next.failed.$(date +%Y%m%d%H%M%S)"
        mv "$APP_DIR/.next" "$failed" || true
      fi
      mv "$OLD" "$APP_DIR/.next" || true
    fi
    if [ ! -d "$APP_DIR/.next" ] && [ -n "$INCOMING" ] && [ -d "$INCOMING" ]; then
      mv "$INCOMING" "$APP_DIR/.next" || true
    fi
    ( cd "$APP_DIR" && pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env >/dev/null ) \
      || pm2 restart "$PM2_APP" >/dev/null 2>&1 || true
  fi
  if [ -n "$STAGE" ] && [ -d "$STAGE" ]; then
    rm -rf "$STAGE"
  fi
  rm -rf "$APP_DIR"/.next.incoming.* 2>/dev/null || true
}

trap rollback EXIT
trap 'exit 130' INT TERM HUP

STAGE="$(mktemp -d "$(dirname "$APP_DIR")/.build-XXXXXXXX")"

echo "==> staging source in $STAGE"
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.next.*' \
  --exclude 'npm-debug.log*' \
  --exclude '.DS_Store' \
  "$APP_DIR"/ "$STAGE"/
ln -s "$APP_DIR/node_modules" "$STAGE/node_modules"

if [ -d "$APP_DIR/prisma" ]; then
  echo "==> generating Prisma client"
  ( cd "$APP_DIR" && npx prisma generate )
fi

echo "==> building (heap cap 1536MB)"
cd "$STAGE"
NODE_ENV=production NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=1536" \
  npm run build

if [ ! -s .next/BUILD_ID ]; then
  echo "build produced no .next/BUILD_ID; live build untouched" >&2
  exit 1
fi
if [ ! -d .next/server ] || [ ! -d .next/static ]; then
  echo "build produced incomplete .next (missing server/ or static/); live build untouched" >&2
  exit 1
fi
echo "==> build ok: $(cat .next/BUILD_ID)"

if [ -d "$STAGE/prisma/migrations" ]; then
  echo "==> applying database migrations"
  ( cd "$STAGE" && npx prisma migrate deploy )
fi

cd "$APP_DIR"
TS="$(date +%Y%m%d%H%M%S)"
INCOMING="$APP_DIR/.next.incoming.$TS"

# move staged build to a sibling first, so the live .next is never absent
mv "$STAGE/.next" "$INCOMING"

LIVE_PID="$(pm2 pid "$PM2_APP" 2>/dev/null | tr -d '[:space:]')"
if [ -z "$LIVE_PID" ]; then
  echo "refusing to swap: PM2 cannot see $PM2_APP (PM2_HOME=${PM2_HOME:-unset}); live build untouched" >&2
  exit 1
fi

OLD=""
SWAPPED=1
if [ -d "$APP_DIR/.next" ]; then
  OLD="$APP_DIR/.next.prev.$TS"
  mv "$APP_DIR/.next" "$OLD"
fi

if ! mv "$INCOMING" "$APP_DIR/.next"; then
  echo "final swap failed; restoring previous build" >&2
  if [ -n "$OLD" ] && [ -d "$OLD" ]; then
    mv "$OLD" "$APP_DIR/.next" || true
    OLD=""
  fi
  SWAPPED=0
  INCOMING=""
  exit 1
fi
INCOMING=""

echo "==> restarting $PM2_APP with backoff config"
OLD_PID="$(pm2 pid "$PM2_APP" 2>/dev/null || true)"
OLD_PID="${OLD_PID//[[:space:]]/}"

pm2 startOrReload "$APP_DIR/ecosystem.config.cjs" --update-env >/dev/null

NEW_PID=""
for _ in $(seq 1 10); do
  NEW_PID="$(pm2 pid "$PM2_APP" 2>/dev/null || true)"
  NEW_PID="${NEW_PID//[[:space:]]/}"
  if [ -n "$NEW_PID" ] && [ "$NEW_PID" != "$OLD_PID" ]; then
    break
  fi
  sleep 1
done

if [ -z "$NEW_PID" ] || [ "$NEW_PID" = "$OLD_PID" ]; then
  echo "pm2 did not start a new process for $PM2_APP; rolling back" >&2
  exit 1
fi

ok=0
failed_path=""
failed_code=""
for _ in $(seq 1 30); do
  all_ok=1
  for path in $HEALTH_PATHS; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "${HEALTH_URL}${path}" || true)"
    if [ "$code" != "200" ]; then
      failed_path="$path"
      failed_code="$code"
      all_ok=0
      break
    fi
  done
  if [ "$all_ok" = "1" ]; then ok=1; break; fi
  sleep 1
done

if [ "$ok" -ne 1 ]; then
  echo "health check failed for ${failed_path} (HTTP ${failed_code}) after deploy; rolling back" >&2
  exit 1
fi

SUCCESS=1
echo "==> healthy"

if ! pm2 save >/dev/null 2>&1; then
  echo "warning: pm2 save failed; deploy is healthy but PM2 state not persisted" >&2
fi

# keep the two most recent previous builds
ls -1dt "$APP_DIR"/.next.prev.* 2>/dev/null | tail -n +3 | xargs -r rm -rf || true
# remove incoming leftovers
rm -rf "$APP_DIR"/.next.incoming.* 2>/dev/null || true
# keep at most two failed builds
ls -1dt "$APP_DIR"/.next.failed.* 2>/dev/null | tail -n +3 | xargs -r rm -rf || true

echo "==> deploy complete"
