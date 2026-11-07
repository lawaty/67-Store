# 03 — P2P Rate Integration

`Docs / 02 Architecture / P2P Rate Integration`

Status: decided

## Intent

The dashboard needs a reference EGP price of 1 USDT on the peer-to-peer market. The design keeps the external provider behind a port with cached reads and graceful degradation.

## Shape

```mermaid
flowchart TD
  Dashboard[/management] --> Reader[P2pRateReader]
  Reader --> Cache[in-process TTL cache (configured sync interval)]
  Cache -->|hit| Dashboard
  Reader -->|miss/stale on error| Provider[Binance P2P adapter]
  Provider -->|quote| Reader
  Reader -->|on success| LastKnown[(rate:usdt:p2p:last)]
  Reader -->|on failure| ExpiredCache[Expired cache]
  ExpiredCache --> Manual[(rate:usdt:p2p)]
  Manual --> LastKnown
  LastKnown --> Unavailable[unavailable]
```

## Port and reader

- Port/cached reader: `src/backoffice/p2p-rate.ts` defines `P2pRate` (`egpPerUsdtMinor`, `fetchedAt`, `source`, `stale`), `P2pQuoteProvider`, and `createP2pRateReader` with an in-process TTL cache that follows the configured sync interval (default 300 seconds / 5 minutes, minimum 300 seconds, maximum 10,800 seconds). A stored `300` is honored as 300.
- The scheduled P2P job writes the persisted current market price to `rate:usdt:p2p:last` (`writeP2pLastKnown`) and appends `rate:usdt:p2p:history` on every successful Binance fetch. The dashboard top bar and sidebar read the persisted last-known via `readP2pLatestRate`; the dashboard chart uses history. `createP2pRateReader().read()` remains the job's fetch path and the bootstrap fallback when no persisted price exists.
- On a fresh quote, the reader stores it in cache and auto-persists it as the last-known rate. On provider failure, it falls back to expired cache (stale) → manual settings key `rate:usdt:p2p` (settable via `/api/admin/settings`) → auto-persisted `rate:usdt:p2p:last` → unavailable. The dashboard renders an unavailable state on outage and never crashes.

## Binance P2P adapter

- Location: `src/integration/binance-p2p/`
- Uses the public search endpoint to fetch sell ads.
- Considers only ads with at least 200 USDT `tradableQuantity` and not platform-promoted (item-level `privilegeType` is non-null); it then takes the median of the 10 cheapest eligible ads and requires a minimum of 3 valid ads, using integer-only parsing for prices.
- Returns a `P2pQuote` for the reader.

## History and dashboard range

Fresh quotes append to a 90-day hourly history keyed by UTC hour (`YYYY-MM-DDTHH:00:00.000Z`); the current hour is a point immediately when observed. At the default 3-hour sync interval the history appends at most 8 points per day. Observations in the same UTC hour accumulate into that hour's point: the hour's min/max widen and the cached observed-offers count with the price sum weight the hour's average. Legacy day-only points are still read and sort at the end of their day. The dashboard P2P card shows the range aggregated over the configured window in hours, default 24 hours. The observed-offers count is an internal cached value used to weight the average; it is not displayed.

## Settings keys

- `rate:usdt:p2p`: manual override written via `/api/admin/settings`.
- `rate:usdt:p2p:last`: auto-persisted after successful fetches by the reader.
- `rate:usdt:p2p:window_hours`: dashboard aggregation window in hours (1-720, default 24); the legacy `rate:usdt:p2p:window_days` key is read as a fallback (days × 24) and deleted when the hours key is written.
- `rate:usdt:p2p:sync_interval_seconds`: reader sync interval, default 300 seconds (5 minutes), minimum 300 seconds, maximum 10,800 seconds. A stored `300` is honored as 300.

## Testing

Tests inject a fake fetch and never hit the network.
