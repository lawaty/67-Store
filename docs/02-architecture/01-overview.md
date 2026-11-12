# 01 — Architecture Overview

`Docs / 02 Architecture / Overview`

Status: draft

## Principle

One domain, several surfaces. The domain and its rules are shared; the web app,
the mobile apps and the scripts are thin front ends over it.

## Surfaces

| Surface | When | Role |
| --- | --- | --- |
| Web app | First | The topup website clients use. Includes the distributor API integration. |
| Mobile apps | Later | Same domain, mobile clients. |
| Scripts | Supporting | Operations and tooling. |

## Stack

- Next.js (App Router) and TypeScript in one application that serves both pages and API route handlers.
- MariaDB, the database CyberPanel already provisions. Prisma is the access layer.
- Domain code lives in the packages directly under `src/` (`shared`, `catalogue`, `ordering`, `promos`, `accounts`, `payments`, `fulfilment`, `backoffice`, `wallet`, `jobs`, `integration/g2bulk`, `infrastructure/prisma`) and imports nothing from Next.js, Prisma or the payment SDKs. Route handlers, server actions and admin screens call into it; they hold no business rules.
- Payments: see [05 Payments](../03-specs/05-payments.md).

## Level 1 — System context

Who uses 67 Store and what it depends on.

Solid arrows are calls 67 Store makes; dotted arrows are calls the other side makes
to it.

```mermaid
flowchart LR
  C["Client<br/><i>buys topups</i>"]
  O["Operator<br/><i>runs the back office</i>"]
  S["<b>67 Store</b><br/>sells topups, follows each order"]
  G["G2Bulk<br/><i>distributor</i>"]
  PM["Paymob<br/><i>EGP payments</i>"]
  CR["Crypto provider<br/><i>USD payments</i>"]
  C -->|buys topups| S
  O -->|operates| S
  S -->|places and tracks orders| G
  G -.->|webhooks| S
  S -->|creates charges| PM
  PM -.->|confirms| S
  S -->|creates charges| CR
  CR -.->|confirms| S
```

## Level 2 — Containers

```mermaid
flowchart LR
  C["Client"]
  O["Operator"]
  subgraph store["67 Store"]
    WEB["<b>Web app</b><br/>Next.js, Node 20<br/><i>storefront, accounts, back office, webhooks</i>"]
    JOB["<b>Scheduler</b><br/>systemd timer<br/><i>catalogue sync, payment recheck, order polling</i>"]
    DB[("<b>Database</b><br/>MariaDB<br/><i>clients, catalogue, orders, payments</i>")]
  end
  G["G2Bulk<br/><i>distributor</i>"]
  PM["Paymob<br/><i>EGP</i>"]
  CR["Crypto provider<br/><i>USD</i>"]
  C --> WEB
  O --> WEB
  WEB --> DB
  JOB --> DB
  WEB -->|places orders| G
  G -.->|webhooks| WEB
  JOB -->|polls status| G
  WEB -->|charges| PM
  PM -.->|confirms| WEB
  WEB -->|charges| CR
  CR -.->|confirms| WEB
```

## Deployment

Deployment, environment variables, migrations, job scheduling, and the live/sandbox switch are owned by [05 Deployment](05-deployment.md).

## Boundaries

- The distributor is an external system. It sits behind an adapter — see
  [02 Distributor Integration](02-distributor-integration.md) and the
  [anti-corruption rule](../00-method/02-ddd.md).
- No surface talks to a distributor API directly.
