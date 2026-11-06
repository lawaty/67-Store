# 03 — P2P Rate Integration

`Docs / 02 Architecture / P2P Rate Integration`

Status: decided

## Intent

The dashboard needs a reference EGP price of 1 USDT on the peer-to-peer market. The design keeps the external provider behind a port with cached reads and graceful degradation.

## Shape

```mermaid
flowchart TD
  Dashboard[/management] --> Reader[P2pRateReader]
  Reader --> Cache[60s in-process TTL cache]
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

- Port/cached reader: `src/backoffice/p2p-rate.ts` defines `P2pRate` (`egpPerUsdtMinor`, `fetchedAt`, `source`, `stale`), `P2pQuoteProvider`, and `createP2pRateReader` with a 60-second in-process TTL cache.
- On a fresh quote, the reader stores it in cache and auto-persists it as the last-known rate. On provider failure, it falls back to expired cache (stale) → manual settings key `rate:usdt:p2p` (settable on the management settings page) → auto-persisted `rate:usdt:p2p:last` → unavailable. The dashboard renders an unavailable state on outage and never crashes.

## Binance P2P adapter

- Location: `src/integration/binance-p2p/`
- Uses the public search endpoint to fetch sell ads.
- Takes the median of the 10 cheapest sell ads, requires a minimum of 3 valid ads, and uses integer-only parsing for prices.
- Returns a `P2pQuote` for the reader.

## Settings keys

- `rate:usdt:p2p`: manual override written by the management settings page.
- `rate:usdt:p2p:last`: auto-persisted after successful fetches by the reader.

## Testing

Tests inject a fake fetch and never hit the network.
