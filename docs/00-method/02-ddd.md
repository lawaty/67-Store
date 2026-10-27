# 02 — Domain-Driven Design

`Docs / 00 Method / DDD`

Status: placeholder

## Rule

The code speaks the language of the store, not the language of the reseller
APIs. Reseller terminology is translated at the boundary.

## Bounded contexts

TBD — candidate list only, not yet agreed:

- Catalog — games, platforms, products (e.g. currency packs), prices.
- Ordering — placing and paying for a topup.
- Fulfilment — sending the order to a reseller and tracking its outcome.
- Accounts — customers, sessions, support.
- Reseller integration — one context per reseller adapter, plus a shared
  anti-corruption layer that maps our model to theirs.
- Back office — pricing, stock of reseller balance, reporting.

## Ubiquitous language

TBD — see [01 Domain](../01-domain/README.md). Terms are agreed there first and
only then used in code.

## Rules for this project

- Reseller data models never leak into the core domain.
- Contexts are separate modules; cross-context communication goes through an
  explicit interface or event, not shared tables or shared types.
- TBD — repositories, aggregates and events relevant to topup orders.
