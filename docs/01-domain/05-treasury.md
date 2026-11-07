# 05 — Treasury

`Docs / 01 Domain / Treasury`

Status: draft

## Scope

The USDT the store pre-funds with the distributor, its funding lots, WAC, consumption by orders, reconciliation, and rounding. Credit and coin issuance live in [06 Credits](06-credits.md); the order snapshot lives in [07 Orders](07-orders.md).

## Units and cost basis

USDT is the treasury unit, carried as USD minor units (100 = 1 USDT). EGP is the cost basis: each funding lot records the total EGP paid including fees, and WAC, COGS and FX-facing values are expressed in EGP minor units.

## Funding lots

A funding is one purchase of USDT loaded into the distributor. It records:

| Field | Meaning |
| --- | --- |
| `id` | The funding lot id. |
| `egpPaidMinor` | Total EGP paid including fees, in EGP minor units. |
| `usdtMinor` | USDT received, in USD minor units. |
| `createdAt` | When the lot was recorded. |

Funding lots are recorded with their EGP basis at record time. A mistaken funding lot can be removed by a guarded rollback that hard-deletes the lot when the remaining recorded USDT and EGP basis stay non-negative and recorded USDT stays at or above reserved USDT; WAC, recorded, free and available are derived, so they recompute on the next read. Order-consumption entries are not deletable: they represent delivered orders and deleting them would desync the treasury from the order/wallet state.

## WAC

```
WAC = Σ EGP paid ÷ Σ USDT received
```

Buying moves the WAC; spending removes quantity at the current WAC and leaves
the WAC unchanged. Both parts are integers: USDT quantity in USD minor units and
EGP paid in EGP minor units.

Worked example:

| Step | USDT | EGP paid | WAC (EGP/USDT) |
| --- | --- | --- | --- |
| Fund 500 USDT @ 50 EGP | 500 | 25,000 | 50 |
| Spend 200 USDT | 300 | 15,000 | 50 |
| Fund 1,000 USDT @ 55 EGP | 1,300 | 70,000 | 53.85 |

## Consumption

An order consumes USDT when it is delivered. The consumption is recorded once
per order and uses the cost and WAC saved in the order snapshot; the live WAC at
delivery time does not change it. A failed order consumes nothing and its
consumption is never written.

## Reconciliation

```
expected balance = Σ funding USDT − Σ consumption USDT
```

A scheduled job compares the expected balance with the distributor's live balance. A gap
inside the configured tolerance (default 1 USDT) is recorded and ignored. A gap
outside it is recorded as an alert. A balance that rose without a matching
funding is reported as **free (unregistered) USDT**; it is never
absorbed silently.

## Rounding

- Everything is an integer; funding lots may be removed by the guarded rollback described above, while order-consumption entries are never deleted.
- One rounding point per derived value. Rates and COGS round half-up.
- Every order keeps its snapshot; every wallet's entries add up to its balance.

## Average coin funding cost

```
average coin funding cost = Σ deposit EGP value ÷ Σ coins issued
```

This is the EGP cost of the coins that have been issued. It is an admin accounting metric, separate from treasury WAC, and it does not drive pricing.

## Invariants

1. `Σ funding − Σ consumption = expected balance`, within tolerance.
2. Every delivered order has a snapshot and one matching consumption.
3. No product's coin price is below its distributor cost.

## Links

- [06 Credits](06-credits.md)
- [07 Orders](07-orders.md)
- [03 Glossary](03-glossary.md)
- [04 Pricing and markup](04-pricing-markup.md)
