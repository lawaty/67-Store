# 01 — Domain Overview

`Docs / 01 Domain / Overview`

Status: draft

## What 67 Store is

A **games topup store**. Customers buy topups for games and have them delivered
to their game account.

## Business model

We do not hold the stock ourselves. Topups are fulfilled by **resellers**, whose
APIs we call. Our margin is the difference between the customer price and the
reseller price.

## Surfaces

| Surface | Priority | Status |
| --- | --- | --- |
| Web app (topup website) | First | Not started |
| Mobile apps | Later | Not started |
| Scripts (operations, tooling) | Supporting | Not started |

All surfaces share the same domain; the web app is simply the first one built.

## Bounded contexts (candidates)

Not yet agreed. Candidate list:

- Catalog — games, platforms, products (e.g. currency packs), prices.
- Ordering — placing and paying for a topup.
- Fulfilment — sending the order to a reseller and tracking its outcome.
- Accounts — customers, sessions, support.
- Reseller integration — one context per reseller adapter, plus a shared
  anti-corruption layer that maps our model to theirs.
- Back office — pricing, reseller balance, reporting.

TBD — repositories, aggregates and events relevant to topup orders.

## Current stage

Researching resellers in order to decide which reseller(s) we will deal with.
That decision gates the software work that connects to their APIs, which is part
of the website.

## Open questions

- Which games / platforms are in the first catalogue?
- Which payment methods do we accept?
- Currencies and pricing model.
- Refund and dispute policy when a reseller fails to deliver.
