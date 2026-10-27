# 02 — Resellers

`Docs / 01 Domain / Resellers`

Status: research in progress — **no reseller chosen yet**

## Why this matters

The reseller is the fulfilment provider. Their API becomes part of our website,
so the choice fixes our integration work, our price floor, our delivery latency
and our failure modes.

## What we are researching

TBD — criteria to score candidates on. Candidates to consider:

- Game / region catalogue coverage.
- Price and margin.
- API quality: auth model, order placement, status polling, webhooks/topups,
  idempotency, rate limits, error semantics.
- Delivery reliability and typical latency.
- Balance / prepayment model and top-up of our reseller wallet.
- Support responsiveness and dispute handling.
- Terms, legal and KYC requirements.
- Sandbox / test environment availability.

## Candidate matrix

| Reseller | Catalogue | Pricing | API quality | Reliability | Balance model | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | | | | | | |
| TBD | | | | | | |

## Decision

TBD — not made.

Record the decision here with the date and the reasoning, and link the resulting
integration spec in [03 Specs](../03-specs/README.md).

## Consequences once decided

- Integration work in the website is designed against the chosen API.
- [Reseller integration architecture](../02-architecture/02-reseller-integration.md)
  is filled in.
