# 03 — Components

`Docs / 02 Architecture / Components`

Status: draft

## Web app components

The components inside the web app. Each bounded context is one component and the
distributor sits behind an adapter, so no domain rule sees the distributor's
vocabulary.

```mermaid
flowchart LR
  subgraph web["Web app"]
    SF["<b>Storefront</b><br/><i>routes</i>"]
    AC["<b>Accounts</b><br/><i>sign-in, profiles, wallet, history</i>"]
    AD["<b>Back office</b><br/><i>routes</i>"]
    CAT["<b>Catalogue</b><br/><i>domain</i>"]
    ORD["<b>Ordering</b><br/><i>domain</i>"]
    PAY["<b>Payments</b><br/><i>port</i>"]
    FUL["<b>Fulfilment</b><br/><i>domain</i>"]
    PR["<b>Promos</b><br/><i>domain</i>"]
    WA["<b>Wallet</b><br/><i>domain</i>"]
    JOB["<b>Jobs</b><br/><i>scheduled tasks</i>"]
    GAD["<b>Distributor adapter</b><br/><i>anti-corruption layer</i>"]
  end
  DB[("Database<br/>MariaDB")]
  PM["Paymob"]
  G["Distributor"]
  SF --> CAT
  SF --> AC
  SF --> ORD
  AC --> ORD
  AC --> WA
  AD --> CAT
  AD --> WA
  ORD --> PR
  ORD --> PAY
  ORD --> FUL
  PAY --> PM
  FUL --> GAD
  GAD --> G
  JOB --> CAT
  JOB --> FUL
  CAT --> DB
  ORD --> DB
  PR --> DB
  WA --> DB
```

## Code

Not modelled. The glossary in [03 Glossary](../01-domain/03-glossary.md) fixes the
names the classes carry.
