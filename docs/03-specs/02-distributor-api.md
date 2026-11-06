# 02 — Distributor API Integration

`Docs / 03 Specs / Distributor API Integration`

Status: ready

This page is the concrete contract. It is the home for endpoint paths, payloads and statuses.

## Connection

- Base URL `https://api.g2bulk.com`.
- Auth header `X-API-Key` on every authenticated call.
- Key IP-locked to the server.
- USD throughout.

## Endpoints we call

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/games` | public | enumerate games |
| GET | `/v1/games/{code}/catalogue` | public | products and USD amount |
| POST | `/v1/games/checkPlayerId` | public | validate a player and get the in-game name |
| POST | `/v1/games/{game}/order` | key | place a topup order |
| POST | `/v1/games/order/status` | key | poll one order |
| GET | `/v1/games/orders` | key | list orders for reconciliation |
| GET | `/v1/getMe` | key | account and USD balance |

## Player validation

Request `{ game, user_id, server_id }`; response `{ name, valid }` where `valid` is the string `valid` or `invalid`. `name` is the in-game name and is empty when invalid. Public, limited to 120 calls per minute per IP. The checkout calls this before payment and shows `name`.

## Placing an order

`POST /v1/games/{game}/order` with headers `X-API-Key` and `X-Idempotency-Key`. Body `{ catalogue_name, player_id, server_id, remark }`: `catalogue_name` is the catalogue item's `name` verbatim; `player_id` and `server_id` are strings; `remark` carries our order id. The idempotency key is exactly a 36-character UUID derived deterministically from our order id, so retries reuse it. The response on success contains an order with an order id, a status and a price. HTTP 410 marks the order failed.

## Statuses

Distributor statuses `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`. HTTP 410 marks the order failed.

## Order status

`POST /v1/games/order/status` with body `{ order_id: <number>, game }`. `order_id` must be a number; a UUID or numeric string is rejected with 400. The same order id comes back from the place-order response.

## Catalogue

`GET /v1/games/{code}/catalogue` returns `{ catalogues: [{ id, name, amount }] }`. `amount` is USD with 3 decimals, rounded up to minor units on our side.

## Games

`GET /v1/games` returns `{ games: [{ id, code, name, image_url }] }`.

## Orders list

`GET /v1/games/orders` returns `{ orders: [...], pagination: { limit, page, total, total_pages } }`.

## Balance

`GET /v1/getMe` returns `{ balance, success, ... }`. `balance` is the upstream credit in USD available for fulfilment. Used by the back-office balance panel.

## Webhooks

POST to our `callback_url` with headers `webhook-id`, `webhook-timestamp`, `webhook-signature`, `X-G2Bulk-Event`. Events `topup.completed` and `topup.failed`. Verification: base64-decode the secret after `whsec_`, compute HMAC-SHA256 over `{webhook-id}.{webhook-timestamp}.{raw body}`, base64-encode, compare against each `v1,` value in the signature header, and reject a timestamp older than five minutes. The handler returns 2xx within ten seconds and deduplicates on `event_id`.

## Errors and limits

400 is our bug and is not retried; 401 and 403 are configuration faults and alert; 404 means not ours; 410 is terminal; 429 honours `Retry-After`; 5xx retries with backoff. Limits are 1,000 requests per 10 seconds per IP and per key, and 120 player checks per minute per IP.

## Distributor integration

- No sandbox.
- No currency field, USD only by description.
- The catalogue `amount` is assumed to be our wholesale cost until the first real order confirms it.
- Product-order webhooks are out of scope.

## Acceptance

- Every adapter method has a contract test replaying a recorded response; no test calls the live API.
- Signature verification rejects a stale timestamp, a tampered body and a missing signature.
- A repeated idempotency key returns the same distributor order id.
- 410 and `FAILED` both map to `failed`; `COMPLETED` maps to `delivered`.
