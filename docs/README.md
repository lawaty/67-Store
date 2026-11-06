# 67 Store — Documentation

`Docs`

## What this is

Documentation for **67 Store**, a games topup store. The product will ship as a
web app, mobile apps and supporting scripts; the **web app is built first**.

## 00 — Method

How we build 67 Store.

| Page | Answers |
| --- | --- |
| [README](00-method/README.md) | How is the method section organised? |
| [01 TDD Rules](00-method/01-tdd.md) | How is work tested and behaviour preserved? |
| [02 DDD Modeling Rules](00-method/02-ddd.md) | How is the domain model shaped and how may it change? |

## 01 — Domain

What 67 Store sells and how the business works.

| Page | Answers |
| --- | --- |
| [README](01-domain/README.md) | What does 67 Store sell and how does the business work? |
| [01 Overview](01-domain/01-overview.md) | What is 67 Store and what are its bounded contexts? |
| [02 Distributors](01-domain/02-distributors.md) | Who supplies topups to us? |
| [03 Glossary](01-domain/03-glossary.md) | What is the ubiquitous language? |
| [04 Pricing and markup](01-domain/04-pricing-markup.md) | How is the sell markup resolved and snapshotted? |

## 02 — Architecture

How the software is put together.

| Page | Answers |
| --- | --- |
| [README](02-architecture/README.md) | How is the architecture section organised? |
| [01 Overview](02-architecture/01-overview.md) | What are the users, systems and containers? |
| [02 Distributor Integration](02-architecture/02-distributor-integration.md) | How are distributor APIs called? |
| [03 P2P Rate Integration](02-architecture/03-p2p-rate-integration.md) | How is the P2P USDT/EGP market rate fetched and cached? |
| [04 Components](02-architecture/04-components.md) | What components live inside the web app? |

## 03 — Specs

What each deliverable must do.

| Page | Answers |
| --- | --- |
| [README](03-specs/README.md) | How is the specs section organised? |
| [01 Web App](03-specs/01-web-app.md) | What must the topup website do? |
| [02 Distributor API Integration](03-specs/02-distributor-api.md) | What is the G2Bulk adapter contract? |
| [03 Mobile Apps](03-specs/03-mobile-apps.md) | What must the mobile clients do? |
| [04 Scripts](03-specs/04-scripts.md) | What operations tooling is needed? |
| [05 Payments](03-specs/05-payments.md) | How is client money taken and reconciled? |
| [06 Back Office](03-specs/06-back-office.md) | What does the admin back office do? |
| [07 Treasury and Credits](03-specs/07-treasury-and-credits.md) | How is USDT held, priced, and sold as coins? |

## Reading order
New to the project: read `00 Method`, then `01 Domain`, then `02 Architecture`,
then the specs relevant to your task.

## Status

| Area | State |
| --- | --- |
| Distributor research | Done |
| Distributor decision | G2Bulk |
| Web app | In progress |
| Mobile apps | Not started |
| Scripts | Not started |

Pages that hold no agreed content yet are marked `Status: placeholder`.
