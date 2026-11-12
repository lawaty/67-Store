# 07 — Treasury and credits

`Docs / 03 Specs / Treasury and credits`

Status: in progress

## Scope

The behaviour of the treasury and credits use cases: recording funding, recording deposits, the pre-funding guard, reconciliation, and coin refunds. The model is defined in [05 Treasury](../01-domain/05-treasury.md) and [06 Credits](../01-domain/06-credits.md); the admin UI in [06 Back Office](06-back-office.md); the payment rails in [05 Payments](05-payments.md).

## Use cases

- Record a funding with EGP paid and USDT received — [05 Treasury](../01-domain/05-treasury.md#funding-lots)
- Record a customer coin deposit and reject it beyond available USDT (on `/management/coins`; customer coin deposits are separate from treasury funding, not a funding lot). Deposits are manual entries in EGP or USDT, stored as `USD`; Paymob is the EGP provider. Crypto is deferred. The coins page lists them newest first in one operations table (date, reference, client, amount paid, price, coins, EGP value, WAC) — [06 Credits](../01-domain/06-credits.md#pre-funding-rule)
- Reconcile the distributor balance — [05 Treasury](../01-domain/05-treasury.md#reconciliation)
- Refund coins on a failed delivery — [05 Payments](05-payments.md)

## Market rate

The market USDT/EGP rate comes from the P2P integration, including its history, aggregation window, and sync interval; see [03 P2P Rate Integration](../02-architecture/03-p2p-rate-integration.md).

## Pre-funding guard

A deposit is accepted only when the new coins' reserved USDT does not exceed available USDT:

```
reserved USDT = coins outstanding × coin value (cents) × 10   (milli-USDT)
available USDT = recorded USDT − reserved USDT                (milli-USDT)
```

Only recorded treasury USDT counts; available USDT is recorded minus reserved. A deposit that would issue more coins than available USDT is rejected: no coins are issued and no payment is taken. See [06 Credits](../01-domain/06-credits.md#pre-funding-rule).

## Pricing guard

The product price in coins is `ceil(USD sell price ÷ coin value)`, where the sell price is the synced distributor cost plus markup and the coin value comes from the coin index. At checkout the guard compares the live distributor cost with the synced cost. A drift at or below the tolerance (default 2%) is absorbed from the markup and the order proceeds at the synced price. A larger drift holds the order, charges nothing, and raises an alert. An empty or stale catalogue holds the order; it is never accepted. No product's coin price may fall below its distributor cost, and promo discounts are clamped so the price never drops under cost. See [04 Pricing and markup](../01-domain/04-pricing-markup.md).

## Refunds

A failed delivery re-credits the coins exactly once and consumes no USDT. The refund is written as a wallet entry keyed by the order and stamps `refundedAt` on the order, so a duplicate failure cannot credit twice. Coins are refunded only as coins. A non-coin payment is refunded through its provider, per [05 Payments](05-payments.md).

## Acceptance

- A funding records EGP paid and USDT received.
- A deposit is rejected when the requested coins' reserved USDT exceeds available USDT.
- A delivered order writes exactly one consumption; a duplicate delivery alert writes none.
- A failed order refunds the coins once and consumes nothing.
- A price drift beyond tolerance holds the order and charges nothing.

## Open questions

- The launch markup (default 2000 basis points), the deposit fee per currency, and the guard tolerance (default 200 basis points).
- How Gulf payments are converted.
- The floor policy when the market rate falls below WAC.
- The thresholds for stale-sync, low-coverage and product-below-cost alerts, and the default index cap (500 basis points).

## See also

- [04 Pricing and markup](../01-domain/04-pricing-markup.md)
- [03 P2P Rate Integration](../02-architecture/03-p2p-rate-integration.md)
- [05 Treasury](../01-domain/05-treasury.md)
- [06 Credits](../01-domain/06-credits.md)
- [07 Orders](../01-domain/07-orders.md)
- [05 Payments](05-payments.md)
- [06 Back Office](06-back-office.md)
