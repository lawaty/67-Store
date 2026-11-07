# STF-003 — Apply promo code

`Docs / 03 Specs / Stories / STF-003`

Status: in progress

Actor: Client

## Story
As a Client, I want to apply a promo code and pay the discounted price so that I can use a valid discount on my Order.

## Rules
- [01 — Web App](../01-web-app.md)
- [04 — Pricing and markup](../../01-domain/04-pricing-markup.md)
- [05 — Payments](../05-payments.md)

## Acceptance criteria
- Given a valid promo code is applied before the Order is created
  When the Client completes Payment
  Then the discounted price is charged and the promo code is consumed once
- Given a promo code is invalid, expired, exhausted, or inactive
  When the Client applies it
  Then no discounted Order is created

## Tests
`describe('STF-003', ...)` end-to-end. The domain rule it exercises keeps its own unit test.
