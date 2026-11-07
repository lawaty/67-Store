# 08 — Coin switch runbook

`Docs / 03 Specs / Coin switch runbook`

Status: one-time

## Purpose

This runbook performs the one-time change of the coin regime to 1 coin = 1 USDT. It is deleted once it has run. The target regime is defined in [06 Credits](../01-domain/06-credits.md).

## Preconditions

- Confirm the total coins outstanding and that the USDT balance covers it.
- Choose the cutover moment.
- Choose the EGP deposit rate used to convert each wallet's EGP face value into coins.

## Steps

1. Compute the total coins outstanding and confirm the USDT balance covers it.
2. For each wallet, convert the EGP face value at the current EGP deposit rate, rounding up to whole coins.
3. Write one audit wallet entry per wallet with the conversion.
4. Set a migration flag so the migration cannot run twice.

After the switch, prices in coins are `ceil(USD sell price ÷ 100)`, coin deposits use the per-currency deposit rate, and coins outstanding is directly comparable to the USDT balance.

## Verification

- The coin migration is idempotent.
- The migration rounds up to whole coins.
- The migration writes one audit entry per wallet.
- Orders priced before the switch keep their price.

## Notes

- The migration flag is the guard against rerunning the conversion.
- Coins outstanding must be recomputed from wallet balances before and after the migration to confirm coverage and the final comparable balance.