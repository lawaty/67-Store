# JNY-001 — Guest buys a topup end to end

`Docs / 03 Specs / Journeys / JNY-001`

Status: in progress

## Actor and goal

A [Client](../../01-domain/03-glossary.md) acting as a guest (without a Client account). Goal: receive a topup for their Player id in one visit.

## Preconditions

- The Product has a sell price and is available in the catalogue.
- The Payment provider is reachable.
- The Player id and server id are valid for the Distributor.

## Main flow

1. The Client picks a Product and a Payment method in the catalogue: Paymob (EGP) or wallet Coins (crypto is deferred and not offered in the UI).
2. The player step shows the Product, the total and the selected method.
3. A guest enters the Player id and server id without saving a Gaming profile.
4. The server validates the Player id and server id against the Distributor and returns the in-game name; a valid check stores the in-game name on the Order.
5. An optional promo code is entered and validated before the Order is created.
6. The server prices the Order from the synced catalogue increased by the resolved markup, applies the promo discount after markup and never below the distributor cost snapshot, then creates the Payment provider charge server-side and redirects the Client to the provider's hosted page.
7. A verified provider callback marks the Order `PAID`.
8. Fulfilment places the Order with the Distributor and the Order page follows it to `DELIVERED` or `FAILED`.
9. The Client can reopen the Order by its Order token link.

## Alternate flows

- **Coins from the Wallet**: the Client chooses wallet Coins; the Wallet is debited by the Coin price and the Order is marked paid without a provider redirect.
- **Invalid Player id**: validation fails and the flow stops with an Arabic error before any Order or Payment is created.
- **Provider or Fulfilment failure**: the Order ends `FAILED`, the Client is refunded once, and the reason is shown.
- **Price drift beyond tolerance**: the Order is held for review and nothing is charged.

## Postconditions

- The Order reaches `DELIVERED` or `REFUNDED`.
- The Client can reopen the Order by its Order token link.
- Wallet, Payment and treasury effects are recorded for the Order.

## Stories

- [STF-001](../stories/STF-001-buy-topup-with-paymob.md)
- [STF-002](../stories/STF-002-reject-invalid-player.md)
- [STF-003](../stories/STF-003-apply-promo-code.md)

## See also

- [01 Web App](../01-web-app.md)
- [05 Payments](../05-payments.md)
- [07 Orders](../../01-domain/07-orders.md)
