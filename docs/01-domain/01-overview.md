# 01 — Domain Overview

`Docs / 01 Domain / Overview`

Status: draft

## What 67 Store is

A **games topup store**. Clients buy topups and have them delivered to a
player's game account.

## Business model

Three parties. **Distributors** deliver topups to us through their APIs; G2Bulk is
the first. **Clients** buy topups for their own or others’ game accounts. All use
the same storefront and account and are served from the first release.

A client may register an account. An account keeps the client's order history and
the preferences it saved. Guest checkout stays: a client can buy without an account.

Our margin is the difference between the distributor price and the sell price.

## Surfaces

| Surface | Priority | Status |
| --- | --- | --- |
| Web app (topup website) | First | In progress |
| Mobile apps | Later | Not started |
| Scripts (operations, tooling) | Supporting | Not started |

All surfaces share the same domain; the web app is simply the first one built.

## Bounded contexts (candidates)

Candidate list:

- Catalogue — games, products, prices.
- Ordering — placing and paying for a topup.
- Payments — taking money, confirming it, and reconciling it against orders.
- Fulfilment — sending the order to a distributor and tracking its outcome.
- Accounts — client sign-in, saved preferences and order history. A guest checks
  out without one.
- Promos — redeemable promo codes (percentage or fixed amount) with optional usage cap and expiry, consumed when an order is created.
- Wallet — a client's coin balance and its ledger entries.
- Distributor integration — one context per distributor adapter, plus a shared
  anti-corruption layer that maps our model to theirs.
- Client access — the storefront and account clients buy from.
- Back office — pricing, distributor balance, reporting.

Aggregates and events for orders are defined in [01 Web App](../03-specs/01-web-app.md).

## Current stage

Building the web app against G2Bulk for clients. The first catalogue is Mobile
Legends: Bang Bang; other games follow.

## Open questions

- Which crypto payment provider we use; luxtak is under evaluation.
- The refund path when the distributor fails after the client has paid.
- The base/VIP markup settings and EGP conversion rate we launch with.
