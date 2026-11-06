# 03 — Glossary

`Docs / 01 Domain / Glossary`

Status: defined

Ubiquitous language. A term enters code only after it is defined here.

| Term | Meaning |
| --- | --- |
| Distributor | The upstream provider that delivers topups to us and is paid wholesale (G2Bulk). |
| Client | Anyone who buys from 67 Store. |
| Client account | A registered client's record: credentials, saved preferences and order history. |
| Gaming profile | A saved player identity on a client account: a label, a user id and a server id, reused for repeat topups. |
| Wallet | A client's balance in 67 Coins. It is shown in the account and credited by the back office. |
| Coin (67 Coins) | The customer's prepaid credit in the wallet. One coin equals one USDT of distributor value after the coin switch; before it, one coin equals the configured EGP value. |
| Preference | A value a client saves on its account, such as a player id or a currency. |
| Player | The in-game account that receives a topup. For MLBB it is the pair `userId` and `serverId` (zone). |
| Topup | A purchase of in-game currency or a pass, delivered to a player's game account. |
| Game | A title we sell topups for, identified by its distributor game code. The first is `mlbb` (Mobile Legends: Bang Bang). |
| Catalogue | The products a game offers at the distributor, each with the USD amount we are charged. |
| Product | One purchasable denomination of a game: a diamond amount, a pass or a pack, identified by the distributor catalogue id and name. |
| Order | A client's purchase of one product for one player, with one price and one fulfilment outcome. |
| Order token | An unguessable reference that lets a client open their order without an account. |
| Payment | Money received from the client through a payment provider, in one currency, tied to one order. |
| Money | An amount in integer minor units plus an ISO currency code. Never a float. |
| Fulfilment | The delivery of an order through the distributor, and the record of what the distributor reported back. |
| Distributor price | The catalogue amount, in USD, that the distributor charges us for a product. |
| Sell price | What the client pays for a product, in USD, before conversion to the payment currency. |
| Markup | Basis points on the distributor price: base fallback, VIP curve from 30-day delivered coins consumed, or per-client override. Applied basis points and coins consumed are snapshotted on the order. See [Pricing and markup](04-pricing-markup.md). |
| Base markup | A per-game fallback markup in basis points. |
| VIP curve | A per-game list of coin/markup breakpoints used to resolve a client's markup from activity. |
| Markup override | A per-client markup that replaces base and VIP resolution for that client. |
| Coins consumed (30-day) | A client's total coins from `DELIVERED` orders in the last 30 days, across all games. |
| Distributor balance | The USD credit held with the distributor that orders are charged against. |
| Promo code | A redeemable discount code, either a percentage or a fixed amount, with an optional usage cap and expiry, consumed when an order is created. |
| Redemption | The record that ties one promo code to one order; a code cannot be redeemed twice for the same order. |
| Distributor cost snapshots | The distributor price recorded on the order at creation, so margin does not drift when the catalogue price changes. |
| USDT | The dollar-denominated token we buy and load into the distributor; the unit of account behind every coin. |
| Treasury | The USDT we hold with the distributor, its EGP cost, and the records that reconcile them. |
| Funding lot | One purchase of USDT loaded into the distributor, recording the currency paid, amount, fees, USDT received and EGP basis. Append-only. |
| WAC | Weighted average cost: the remaining EGP basis divided by the remaining USDT. Buying moves it; spending leaves it unchanged. |
| Consumption | The USDT an order removes from the treasury when it is delivered, recorded once per order at the order's snapshot WAC. |
| COGS | Cost of goods sold: what a delivered product cost us in EGP, at the order's snapshot WAC. |
| Deposit | A customer payment in a currency that issues coins at that currency's deposit rate. |
| Deposit rate | How many units of a currency buy one USDT, and therefore one coin after the switch. |
| Coverage | The distributor USDT balance divided by the coins outstanding; how much prepaid credit is backed by held USDT. |
| Free USDT | The distributor balance above coins outstanding; the only part that may be withdrawn. |
| Trading margin | The markup in USDT, known at delivery: sell price minus distributor cost. Independent of exchange rates. |
| FX result | The gain or loss at deposit from holding USDT bought earlier, valued in EGP. |
| Break-even rate | The EGP-per-USDT rate at which a deposit neither gains nor loses against WAC. |
| Reconciliation | The daily comparison of the expected USDT balance (funding minus consumption) with the distributor balance. |
| Order snapshot | The distributor cost, WAC, COGS, price and margin recorded on an order at placement so they never drift. |
| P2P rate | The EGP price of 1 USDT on the peer-to-peer market; the dashboard's market-rate reference. |
| coins outstanding | The sum of all wallet coin balances; the reserved side of coverage. |
| coin regime | Whether one coin is worth 1 USDT or the configured EGP value. |
