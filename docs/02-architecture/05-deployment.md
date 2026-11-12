# 05 — Deployment

`Docs / 02 Architecture / Deployment`

How the web app is built, migrated, scheduled, and switched between live and sandbox.

## Runtime

- Next.js builds with `output: "standalone"` and runs as a Node 20 process on `127.0.0.1:3000` under a systemd unit, as the site user.
- Build: `npm ci && npm run build`. Run: `npm run start` (the standalone server).
- Secrets are environment variables on the systemd unit, never in the repository.
- `docker-compose.yml` is the development database only: MariaDB 11.4 on `127.0.0.1:3307` with an empty root password. A deployed instance uses a dedicated database and user.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma MySQL connection string. |
| `G2BULK_API_KEY` | Distributor and catalogue API key; env parsing requires it. |
| `G2BULK_BASE_URL` | Distributor base URL; default `https://api.g2bulk.com`. |
| `G2BULK_WEBHOOK_SECRET` | Verifies `POST /api/webhooks/g2bulk`. |
| `PAYMENT_PROVIDER` | `fake`, `instapay`, `crypto`, or `paymob`; default `fake`. |
| `PAYMOB_API_KEY` | Optional Paymob credential. |
| `PAYMOB_SECRET_KEY` | Optional; required in effect for a Paymob charge. |
| `PAYMOB_PUBLIC_KEY` | Optional Paymob credential. |
| `PAYMOB_INTEGRATION_ID_CARD` | Optional; at least one integration ID is required for a Paymob charge. |
| `PAYMOB_INTEGRATION_ID_WALLET` | Optional; at least one integration ID is required for a Paymob charge. |
| `PAYMOB_HMAC_SECRET` | Optional; verifies Paymob callbacks. |
| `PAYMOB_BASE_URL` | Paymob base URL; default `https://accept.paymob.com`. |
| `APP_URL` | Optional absolute public base URL (e.g. `https://67-store.online`), used for payment return/callback URLs; required for a Paymob charge. |
| `OPERATIONS_MODE` | `live` or `sandbox`; default `sandbox`. Initial mode until an admin saves a choice. |
| `AUTH_SECRET` | Signs customer session cookies; empty disables sessions. |
| `ADMIN_PASSWORD` | Back-office login password. |
| `JOBS_SECRET` | Shared secret for every `/api/jobs/*` endpoint. |
| `ALLOW_FAKE_FULFILMENT` | Allows immediate fulfilment after a fake payment in checkout. |
| `ALLOW_FAKE_PAYMENTS` | Allows fake payment rails in live mode; default `false`. |

## Database

- Apply migrations on every deploy: `npm run db:deploy` (`prisma migrate deploy`).
- `npm run db:migrate` is development only. Do not run `db:push` against a deployed database.
- Back up before migrating (`mariadb-dump`).
- The level and wallet-funding tables arrive in migration `20261107010000_levels_and_wallet_funding`.

## Live and sandbox

The dashboard header switch stores `Setting.operations:mode`; `OPERATIONS_MODE` is only the fallback until a choice is saved. The choice is read per request, so no restart is needed.

- **Sandbox / fake**: `PAYMENT_PROVIDER=fake` uses the fake rails (`/checkout/fake/*` and `/api/payments/fake/*`) with no network calls, a fake distributor (delivers immediately), a fake catalogue, and treasury availability checks bypassed. Run `/api/jobs/sync` (or the admin sync control) once after switching to sandbox to populate the fake catalogue.
- **Paymob test account**: set `OPERATIONS_MODE=live` and `PAYMENT_PROVIDER=paymob` with test keys; optionally set `ALLOW_FAKE_FULFILMENT=true` to stub delivery. A Paymob charge requires `PAYMOB_SECRET_KEY`, at least one integration ID, and `APP_URL`; otherwise the provider is reported as unavailable. By default live uses the configured payment rails; when `ALLOW_FAKE_PAYMENTS=true`, live uses the fake payment rails while retaining the live distributor and catalogue.

## Scheduled jobs

All endpoints are `POST` and require `x-jobs-secret: $JOBS_SECRET`. An empty secret returns 503; a wrong secret returns 401.

| Endpoint | Work | Suggested cadence |
| --- | --- | --- |
| `/api/jobs/poll` | Sync `FULFILLING` orders with the distributor. | Every minute |
| `/api/jobs/reconcile` | Compare the distributor balance with the treasury. | Every 5–15 minutes |
| `/api/jobs/sync` | Sync the catalogue from G2Bulk. | Hourly or daily |
| `/api/jobs/p2p` | Wake the P2P rate reader. It calls Binance only when the P2P sync interval has expired. | Every minute |
| `/api/jobs/expire-payments` | Mark `PENDING` payments older than 60 minutes as `EXPIRED`. | Every 5 minutes |

A single helper keeps the crontab short. Create `/usr/local/bin/67-job`:

```bash
#!/usr/bin/env bash
set -euo pipefail
set -a
. /srv/67-store/.env
set +a
curl -fsS -X POST -H "x-jobs-secret: ${JOBS_SECRET}" "http://127.0.0.1:3000/api/jobs/$1" >/dev/null
```

Then `/etc/cron.d/67-store-jobs`:

```cron
* * * * * root /usr/local/bin/67-job poll
*/5 * * * * root /usr/local/bin/67-job reconcile
0 * * * * root /usr/local/bin/67-job sync
* * * * * root /usr/local/bin/67-job p2p
```

The same four calls can run as four systemd timer units instead; the service runs the helper script and the script sources the environment file.

The P2P refresh cadence is the **P2P sync interval** in the dashboard settings: default 300 seconds (5 minutes), minimum 300 seconds, maximum 10,800 seconds (3 hours). The cron wakes the endpoint every minute; Binance is called only when the sync interval expires. Lower the interval within bounds if you want more frequent samples.

## Deploy checklist

1. `npm ci`
2. `npm run db:deploy` (applies migrations, including the Paymob enum and order-consent columns)
3. Run `prisma migrate deploy` before switching `PAYMENT_PROVIDER`.
4. `npm run build`
5. Restart the app systemd unit.
6. `GET /api/storefront` returns 200 (public, database-backed).
7. Invoke each job once with the secret and check its JSON result.
