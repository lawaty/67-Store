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

## Current stage

Researching resellers in order to decide which reseller(s) we will deal with.
That decision gates the software work that connects to their APIs, which is part
of the website.

## Open questions

- Which games / platforms are in the first catalogue?
- Which payment methods do we accept?
- Currencies and pricing model.
- Refund and dispute policy when a reseller fails to deliver.
