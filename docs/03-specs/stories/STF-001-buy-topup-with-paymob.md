# STF-001 — Buy topup with Paymob

`Docs / 03 Specs / Stories / STF-001`

Status: in progress

Actor: Client (guest)

## Story
As a Client, I want to pay for a topup in EGP through Paymob and receive the topup without signing in so that I can complete a purchase as a guest.

## Rules
- [JNY-001 — Guest buys a topup end to end](../journeys/JNY-001-guest-buys-topup-end-to-end.md)
- [05 — Payments](../05-payments.md)
- [01 — Web App](../01-web-app.md)

## Acceptance criteria
- Given a Client has entered a valid Player id and chosen an available Product
  When the Client pays through Paymob
  Then the Payment is taken, the Order is created and delivered, and the Client can reopen the Order by its Order link
- Given the Distributor cannot fulfil the Order after a coin Payment was charged
  When fulfilment fails
  Then the Order becomes FAILED and the Coins are refunded once

## Tests
`describe('STF-001', ...)` end-to-end. The domain rule it exercises keeps its own unit test.
