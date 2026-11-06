# 07 — Treasury and Credits

`Docs / 03 Specs / Treasury and Credits`

Status: in progress

## Scope

How the store holds its USDT, prices products against it, sells coins, and keeps
its two profit lines apart. The spec covers treasury (funding lots, WAC,
reconciliation), credits (deposits, coverage, the pre-funding rule), the switch
of the coin from EGP to USDT, and the dashboard that reports them.

It does not restate the payment rail mechanics (see [05 Payments](05-payments.md))
or the G2Bulk adapter contract (see [02 Distributor API](02-distributor-api.md)).

## The model

We buy USDT and load it into G2Bulk. Customers pay EGP, SAR, AED or JOD and
receive coins; **1 coin = 1 USDT** of G2Bulk value after the switch in
[Phase 3](#phase-3--the-coin-switch). Products are priced in coins at G2Bulk's
USDT cost plus our markup, rounded up, and the price follows the supplier cost.
We never issue more coins than the USDT we hold. Each USDT lot is a closed
cycle: cost fixed, price fixed, profit fixed.

The design protects four things:

- **Customers:** a coin keeps its value in dollar terms, which suits Egyptian
  and Gulf customers (SAR, AED and JOD are pegged to the dollar).
- **Supplier increases:** the product price moves with G2Bulk's cost, so we
  never absorb a supplier increase.
- **Pre-funding:** the USDT behind every coin is already in the balance, so a
  delay between sale and use cannot turn a sale into a loss.
- **Simplicity:** one WAC, one markup on products, one unit of account.

## Units

- **Money** is integer minor units plus an ISO currency code. Never a float.
  The supported codes are USD, EGP, SAR, AED and JOD.
- **USDT** is carried as USD minor units (100 = 1 USDT). It is a treasury
  quantity, not a payment currency.
- **Coins** are whole integers. One coin is 1 USDT after the switch; before it,
  one coin is the configured EGP value.
- **WAC** is integer EGP minor units per whole USDT.
- A **deposit rate** is integer units of the deposit currency's minor unit per
  whole USDT.

Rates and COGS round half-up; prices round up; deposits round down.

## Treasury

### Funding lots

A funding is one purchase of USDT loaded into G2Bulk. It records:

| Field | Meaning |
| --- | --- |
| `currency` | The currency paid for the USDT. |
| `amountMinor` | What was paid, in that currency's minor unit. |
| `feesMinor` | Fees paid on the purchase, in the same currency. |
| `usdtMinor` | USDT received, in USD minor units. |
| `basisEgpMinor` | The EGP basis the lot contributes to WAC. |
| `createdAt` | When the lot was recorded. |

Funding entries are append-only. A mistaken lot is corrected by a reversal
funding, never by an edit. `basisEgpMinor` is the amount plus fees converted to
EGP; for an EGP lot it is exactly `amountMinor + feesMinor`, and for any other
currency the operator supplies the EGP value. The system never guesses a rate.

### WAC

```
WAC = remaining EGP basis ÷ remaining USDT
```

Buying moves the WAC; spending removes quantity at the current WAC and leaves
the WAC unchanged. Both parts are integers: USDT quantity in USD minor units and
basis in EGP minor units.

Worked example:

| Step | USDT | EGP basis | WAC (EGP/USDT) |
| --- | --- | --- | --- |
| Fund 500 USDT @ 50 EGP | 500 | 25,000 | 50 |
| Spend 200 USDT | 300 | 15,000 | 50 |
| Fund 1,000 USDT @ 55 EGP | 1,300 | 70,000 | 53.85 |

### Consumption

An order consumes USDT when it is delivered. The consumption is recorded once
per order and uses the cost and WAC saved in the order snapshot; the live WAC at
delivery time does not change it. A failed order consumes nothing and its
consumption is never written.

### Balance and reconciliation

```
expected balance = Σ funding USDT − Σ consumption USDT
```

A scheduled job compares the expected balance with G2Bulk's live balance. A gap
inside the configured tolerance (default 1 USDT) is recorded and ignored. A gap
outside it is recorded as an alert. A balance that rose without a matching
funding is reported as **unrecorded funding** and asks for the rate; it is never
absorbed silently.

## Selling coins

### Deposit rates

A deposit is a customer payment that issues coins. It records the currency, the
amount, the rate, the coins issued, the WAC at the time, and the EGP value used
for the FX result. Deposits are append-only, like fundings. The coins issued round down, so the store never issues more USDT than was paid.

| Currency | Rate rule |
| --- | --- |
| EGP | `max(WAC, market) × (1 + fee)` |
| SAR, AED, JOD | USD peg plus the actual spread and fees |

A rate update is capped per update (about ±3%), has a floor, pauses when the
source data is stale, and writes a change history with a team notification.

### Pre-funding rule

A deposit is accepted only when

```
G2Bulk balance − coins outstanding ≥ coins requested
```

Fund first; never sell coins beyond the USDT held. Only the balance above coins
outstanding, the **free USDT**, may be withdrawn, and the software enforces it.

### Coverage

```
coverage    = G2Bulk balance ÷ coins outstanding
free USDT   = G2Bulk balance − coins outstanding
```

Coins outstanding is the sum of every wallet balance, converted to USDT at the
coin's current value. Coverage below the configured threshold raises an alert.

## Pricing and the checkout guard

```
product price (coins) = ceil(distributor cost USDT × (1 + markup))
```

The price is live-linked to the synced G2Bulk cost: every catalogue sync adjusts
it. At checkout the guard compares the live G2Bulk cost with the synced cost.

- A drift at or below the tolerance (default 2%) is absorbed from the markup and
  the order proceeds at the synced price.
- A larger drift holds the order, charges nothing, and raises an alert.
- An empty or stale catalogue holds the order; it is never accepted.

No product's coin price may fall below its USDT cost. Promo discounts
are clamped so the price never drops under cost.

## Order snapshot

Every order saves the values that must not drift afterwards:

| Field | Meaning |
| --- | --- |
| `costMinor` | Distributor cost in USD minor units. |
| `wacEgpMinor` | WAC at the moment the order was placed. |
| `cogsEgpMinor` | `cost × WAC`, in EGP minor units. |
| `tradingMarginMinor` | Sell price minus distributor cost, in USD minor units. |
| `priceCoins` | Derived from the USD sell price and the coin regime; not stored on the order. |
| `currencyReceived` | Recorded on the deposit that issued the coins; an order does not attribute coins to one deposit. |

The order's sell price stays in USD minor units, as it is today; coins are
derived from it.

## Failed delivery and refunds

A failed delivery re-credits the coins exactly once and consumes no USDT. The
refund is written as a wallet entry keyed by the order and stamps `refundedAt`
on the order, so a duplicate failure cannot credit twice. Coins are refunded
only as coins. A non-coin payment is refunded through its provider, per
[05 Payments](05-payments.md).

## Phase 3 — the coin switch

The coin changes from "1 coin = configured EGP value" to "1 coin = 1 USDT".
The switch is one migration:

1. Compute the total coins outstanding and confirm the USDT balance covers it.
2. For each wallet, convert the EGP face value at the current EGP deposit rate,
   rounding up to whole coins.
3. Write one audit wallet entry per wallet with the conversion.
4. Set a migration flag so the migration cannot run twice.

After the switch, prices in coins are `ceil(USD sell price ÷ 100)`, coin deposits
use the per-currency deposit rate, and coins outstanding is directly comparable
to the USDT balance.

## Records and rounding

- Everything is an integer and append-only; corrections are reversal entries.
- One rounding point per derived value. Prices round up; rates and COGS round
  half-up.
- Every order keeps its snapshot; every deposit keeps its currency and rate;
  every wallet's entries add up to its balance.

## Dashboard

The /management dashboard is the single home for treasury reporting. It shows: distributor USDT balance with last-updated time, free USDT, reserved USDT and coins outstanding, WAC with EGP basis, available coins for sale, coverage with a bar, the P2P USDT/EGP market rate with source and staleness plus break-even, trading margin (7/30 days, USDT) and FX result (7/30 days, EGP) separately, delivered order counts (7/30), revenue (7/30, USDT), a 30-day daily series (revenue and orders), an activity feed, and balance warnings. The treasury page is operations only: funding form, deposit form, funding/deposit histories, balance line, deposit rates, latest reconciliation status. For P2P provider design see [03 P2P Rate Integration](../02-architecture/03-p2p-rate-integration.md).

Trading margin is the markup in USDT, known at delivery and independent of
exchange rates. FX result is the gain or loss at deposit from holding USDT bought
earlier. They are reported separately and never summed into one profit number.

## Invariants

1. `Σ funding − Σ consumption = expected balance`, within tolerance.
2. Coins outstanding never exceeds the G2Bulk balance after any deposit.
3. Every delivered order has a snapshot and one matching consumption.
4. A failed order consumes nothing and refunds at most once.
5. No product's coin price is below its cost, and no deposit rate is below its
   floor.
6. Every deposit records its currency, amount and rate.
7. Every wallet's entries add up to its balance.

## Open

- The launch markup (default 2000 basis points), the deposit fee per currency,
  and the guard tolerance (default 200 basis points).
- The currencies accepted at launch and how Gulf payments are converted.
- The floor policy when the market rate falls below WAC.
- The thresholds for stale-sync, low-coverage and product-below-cost alerts, and
  product price-change history.

Per-game/per-client markup policy is owned by pricing settings; see
[Pricing and markup](../01-domain/04-pricing-markup.md).

## Acceptance

- The WAC worked example produces 53.85 after the third step.
- Spending leaves the WAC unchanged.
- A funding with an unrecorded EGP basis is rejected, never guessed.
- A deposit is rejected when requested coins exceed free USDT.
- A delivered order writes exactly one consumption; a duplicate delivery alert
  writes none.
- A failed order refunds the coins once and consumes nothing.
- A price drift beyond tolerance holds the order and charges nothing.
- The coin migration is idempotent, rounds up, and writes one audit entry per
  wallet.
