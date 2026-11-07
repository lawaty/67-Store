# STF-002 — Reject invalid player

`Docs / 03 Specs / Stories / STF-002`

Status: in progress

Actor: Client

## Story
As a Client, I want an invalid Player id rejected before paying so that I do not start a Payment for a Player that cannot be verified.

## Rules
- [JNY-001 — Guest buys a topup end to end](../journeys/JNY-001-guest-buys-topup-end-to-end.md)
- [01 — Web App](../01-web-app.md)

## Acceptance criteria
- Given a Client enters an invalid Player id
  When the Player id is checked
  Then no Payment is started, no Order is created, and an error is shown
- Given a Client enters a valid Player id
  When the Player id is checked
  Then the verified Player name is shown before Payment

## Tests
`describe('STF-002', ...)` end-to-end. The domain rule it exercises keeps its own unit test.
