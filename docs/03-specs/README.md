# 03 — Specs

`Docs / 03 Specs`

What each deliverable must do.

| Page | Deliverable | Status |
| --- | --- | --- |
| [01 Web App](01-web-app.md) | The topup website. | In progress |
| [02 Distributor API Integration](02-distributor-api.md) | distributor adapter (currently G2Bulk). | Ready |
| [03 Mobile Apps](03-mobile-apps.md) | Mobile clients. | Not started |
| [04 Scripts](04-scripts.md) | Operations tooling. | Not started |
| [05 Payments](05-payments.md) | Taking and reconciling client money. | In progress |
| [06 Back Office](06-back-office.md) | Admin back office. | In progress |
| [07 Treasury and Credits](07-treasury-and-credits.md) | Treasury and credit use cases. | In progress |
| [JNY-001 Guest buys a topup](journeys/JNY-001-guest-buys-topup-end-to-end.md) | Guest buys a topup end to end. | In progress |

## Stories

- [STF-001 Buy topup with InstaPay](stories/STF-001-buy-topup-with-instapay.md) — storefront purchase paid with InstaPay.
- [STF-002 Reject invalid player](stories/STF-002-reject-invalid-player.md) — reject an invalid player identity.
- [STF-003 Apply promo code](stories/STF-003-apply-promo-code.md) — apply a promo code to an order.
- [CRD-002 Deposit rejected beyond available USDT](stories/CRD-002-deposit-rejected-beyond-free-usdt.md) — reject a deposit that exceeds available USDT.

## IDs

- `STF` storefront story, `CRD` credits story, `TRE` treasury story, `JNY` journey.
- A story file is `stories/<ID>-<slug>.md`, a journey is `journeys/<ID>-<slug>.md`, and a numbered page is the capability spec.

Specs follow the domain and architecture pages; a spec does not invent a
concept that is not in the [glossary](../01-domain/03-glossary.md).