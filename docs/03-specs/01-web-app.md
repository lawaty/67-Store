# 01 — Web App

`Docs / 03 Specs / Web App`

Status: in progress

## Scope

The storefront that sells Mobile Legends: Bang Bang topups. Clients buy topups
for their own or others’ game accounts and share the same storefront and account.
A client may register an account that keeps its order history and saved
preferences; a client can still check out as a guest. One game at launch; other
games are added by enabling another catalogue line, not by new code. Delivery
goes through the distributor. Stack and deployment:
[02 Architecture / Overview](../02-architecture/01-overview.md).

## Language and direction

Arabic is the site's language and the document carries `lang="ar"` with
`dir="rtl"`. Navigation, tables and layout read right to left; amounts stay
left to right so digits and currency codes read correctly. Interface copy is
Arabic, and a fixed bar above the header states that the site is under review and
that nothing is fully verified. The interface ships its own Arabic typeface, Cairo,
with Noto Sans Arabic as its fallback, so text renders the same on every machine
instead of falling back to a system font.

## Non-goals

- Games other than MLBB.
- Mobile apps.
- Email notifications.
- Multiple admin roles.

## Model

- `Client` — a buyer. Every order names one.
- `Client account` — a registered client: credentials, saved preferences and order history. A `Client` has at most one.
- `Gaming profile` — a saved player identity on an account: label, user id, server id and the verified in-game name returned by the distributor.
- `Wallet` — a client's 67 Coins balance, with an entry per movement.
- `Product` — a catalogue denomination with its distributor id, name and USD cost.
- The Order aggregate, its fields and its financial snapshot are defined in [07 Orders](../01-domain/07-orders.md).
- `Payment` — a provider charge against one order: provider, provider reference, amount in minor units, currency, status.
- `Player` — value object of `userId` and `serverId`, validated before payment.
- `Money` — amount in integer minor units plus an ISO currency code. No floating point anywhere.

## Order lifecycle

See the state diagram in [07 Orders](../01-domain/07-orders.md#lifecycle).

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Catalogue: the MLBB product grid. Each product offers actions to pay in EGP through Paymob and to pay with wallet coins (crypto is deferred and not offered in the UI). |
| `/mlbb/[product]/[method]` | Player step for a product and a method already chosen in the catalogue, where the product is the denomination slug and the method is `paymob`, `crypto` or `coins`. Shows the price, lists the account's saved gaming profiles, accepts a new player id and server id, and offers to save them. |
| `/account/login` | Sign in to a client account. |
| `/account/register` | Create a client account. |
| `/account/profiles` | Add, list and remove gaming profiles for the signed-in client. A new profile's player id and server id are checked with the distributor first, and the returned in-game name is stored on the profile. |
| `/checkout/fake/[reference]` | Fake payment page used in fake payment mode. |
| `/account` | Sign-in, wallet balance and movements, saved gaming profiles, order history and preferences. |
| `/order/[token]` | Order status for the client, reachable only by an unguessable token. |
| `/management/*` | Back office, behind a single admin login — see [06 Back Office](06-back-office.md). |

## Checkout flow

The end-to-end guest purchase is [JNY-001](journeys/JNY-001-guest-buys-topup-end-to-end.md).

## Pricing

Pricing and markup are defined in [04 Pricing and markup](../01-domain/04-pricing-markup.md). The storefront stores the sale price in USD minor units, derives the EGP display price at the configured rate, and derives the coin price from the coin value.

## Back office

Admin behaviour is specified in [06 Back Office](06-back-office.md). The storefront links to no admin route.

## Acceptance

- Every available product offers working payment choices for the offered methods (Paymob and wallet coins).
- Paying with coins debits the wallet by the coin price and leaves the order paid.
- An invalid player id never reaches payment.
- A valid player check stores the in-game name on the order and it is shown on the order page.
- A client can complete a purchase without an account.
- A guest who saves details is registered and returns to the same player step with the profile saved.
- A signed-in client sees only its own order history; a guest order stays reachable by its token.
- A saved gaming profile fills the player id and server id without retyping.
- One client cannot open another client's order.
- A promo code is validated before the order is created and consumed at creation; an invalid, expired, exhausted or inactive code creates no discounted order.
- A failed distributor order ends `REFUNDED` and the client sees the reason.

## Tests

Unit and contract tests with Vitest, end-to-end with Playwright, per [00 Method / TDD](../00-method/01-tdd.md).
