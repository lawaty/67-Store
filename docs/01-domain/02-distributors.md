# 02 — Distributors

`Docs / 01 Domain / Distributors`

Status: decided — G2Bulk, 2026-10-29

## Why this matters

The distributor is the upstream provider. Their API becomes part of our website,
so the choice fixes our integration work, our price floor, our delivery latency
and our failure modes.

## Decision

G2Bulk fulfils every topup in the first release.

- The `mlbb` catalogue line covers the rest of the world including MENA and Egypt. `mlbb_global` is Indonesia-only and is not used.
- The `Weekly` product is listed at $1.408 on the `mlbb` line.
- No minimum purchase, no subscription and no declared commission. Funding is crypto-only, which matches clients paying us in crypto.
- The catalogue, player validation and required-fields endpoints are public, so the website can be built and tested before the distributor wallet is funded.
- The API documents idempotency keys, signed webhooks and a webhook delivery log with resend.

## Candidates

| Distributor | MLBB weekly product seen at | Model | Outcome |
| --- | --- | --- | --- |
| G2Bulk | $1.408 (`Weekly`) | Crypto-only funding, no minimum, no monthly fee | Chosen |
| FazerCards | $1.408 (`Weekly Pass`) | Monthly $4 plan; MENA coverage only where a SKU is listed | Not chosen |
| RechargeGames | $1.53 (`Weekly Pass`, Global line) | API docs and key only after account approval | Not chosen |
| aluu.in | $1.42 and $1.775 on different packages | Calls rejected until the server IP is whitelisted | Not chosen |
| FlashTopup | $1.78 (Global) | Strongest webhook security; no MLBB line covering MENA | Not chosen |
| SHOP2TOPUP | not verified | Claims one global MLBB client; the first key issued is a production key | Not chosen |

## Accepted risks

- Funding the distributor wallet is crypto-only: network fees, no card funding, no auto-recharge.
- No sandbox. Tests run against recorded responses and the first real order is the acceptance test.
- Amounts are USD only by field description; the API has no currency field.
- Egyptian delivery is unverified until a real `checkPlayerId` call and one real order succeed.
- The catalogue `amount` is taken to be our wholesale cost; the first real order confirms it.
- Denomination names differ between distributors (`Weekly`, `Weekly Pass`, `Weekly Elite Pack`), so price comparison matches the exact product name, never the weekly label.

## Consequences

The distributor API contract is specified in [02 Distributor API](../03-specs/02-distributor-api.md) and the adapter shape in [02 Distributor Integration](../02-architecture/02-distributor-integration.md). Sell prices derive from the synced catalogue. `Distributor` is defined in [03 Glossary](03-glossary.md).