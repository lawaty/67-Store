# 06 — Credits

`Docs / 01 Domain / Credits`

Status: draft

## Scope

Coins, the wallet, deposits and deposit rates, the pre-funding rule, coverage, the FX result, and the credit invariants. Treasury, funding lots, WAC and consumption live in [05 Treasury](05-treasury.md). The coin index and the coin's value live in [04 Pricing and markup](04-pricing-markup.md#coin-index).

## Coin

A [coin (67 Coins)](03-glossary.md) is a whole integer of prepaid credit. Its value is the [coin value](04-pricing-markup.md#coin-index): `index` USD cents (USD minor units), initially 1 cent (0.01 USDT). A coin is a claim on catalogue purchasing power, not a claim on USDT.

## Wallet

A [wallet](03-glossary.md) holds a client's balance in coins. The balance is determined by the wallet's ledger entries: every wallet's entries add up to its balance.

## Deposits and rates

A deposit is a customer payment that issues coins. It records the currency, the amount, the rate, the coins issued, the WAC at the time, and the EGP value used for the FX result. Deposits are append-only, like fundings. The coins issued round down. Deposits are recorded only in EGP and USDT; USDT is stored as `USD` because the currency code is three letters. On the back-office coins page they appear newest first in one operations table: date, reference, client, amount paid, price, coins, EGP value and WAC.

A deposit rate is the number of currency minor units that buy one coin.

| Currency | Rate rule |
| --- | --- |
| USDT (stored as `USD`) | The coin value. |
| EGP | The coin value × `max(WAC, market)`, in consistent EGP minor units. |

A fee in basis points is applied to the resolved rate and rounded half-up. Invalid stored rates and fees fall back to their defaults.

## Pre-funding rule

A deposit is accepted only when the new coins' reserved USDT does not exceed available USDT:

```
reserved USDT = coins outstanding × coin value (cents) × 10   (milli-USDT)
available USDT = recorded USDT − reserved USDT                (milli-USDT)
```

Only recorded treasury USDT counts. The live distributor balance does not make coins sellable on its own. Only the balance above reserved USDT, the **[available USDT](03-glossary.md)**, may be withdrawn, and the software enforces it.

## Coverage

```
coverage  = live distributor USDT balance ÷ reserved USDT
available USDT = recorded USDT − reserved USDT
```

Coins outstanding is the sum of every wallet balance. Treasury quantities and reserved/available USDT are in milli-USDT (coin value stays in USD cents, reserved as `coins × coin value (cents) × 10`). Coverage is an internal invariant check, not a dashboard metric: the pre-funding guard keeps reserved USDT at or below recorded USDT, and reconciliation alerts on any live-balance gap. Buying and deposits use available USDT; coverage uses the live balance.

## FX result

A deposit records the EGP value used for the [FX result](03-glossary.md). For a non-EGP deposit, the value is the coins' reserved USDT converted at the EGP-per-USDT rate. The FX result is the gain or loss at deposit from holding USDT bought earlier, valued in EGP. It is reported separately from trading margin.

## Invariants

1. After any deposit, reserved USDT does not exceed recorded USDT.
2. Every deposit records its currency, amount and rate.
3. Every wallet's entries add up to its balance.

## Links

- [04 Pricing and markup](04-pricing-markup.md)
- [05 Treasury](05-treasury.md)
- [03 Glossary](03-glossary.md)
- [05 Payments](../03-specs/05-payments.md)
