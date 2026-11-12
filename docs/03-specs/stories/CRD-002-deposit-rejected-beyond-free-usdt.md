# CRD-002 — Deposit rejected beyond available USDT

`Docs / 03 Specs / Stories / CRD-002`

Status: in progress

Actor: Client buying coins

## Story
As a Client buying Coins, I want a Deposit rejected when it would issue more Coins than the available USDT backing them so that the Coins I receive stay within Coverage.

## Rules
- [Pre-funding rule](../../01-domain/06-credits.md#pre-funding-rule)
- [05 — Payments](../05-payments.md)

## Acceptance criteria
- Given recorded USDT is 10,000 milli-USDT and coins outstanding are 900 at 1 cent per coin (reserved 9,000 milli-USDT)
  When a Client requests a Deposit issuing 150 Coins
  Then the Deposit is rejected, no Coins are issued, and no Payment is taken
- Given the Deposit issues at most the available USDT
  When it is recorded
  Then the Coins are issued and the Deposit records its currency, amount and rate

## Tests
`describe('CRD-002', ...)` end-to-end. The domain rule it exercises keeps its own unit test.
