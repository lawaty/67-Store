# Pricing and markup

Markup is the percentage added to the distributor price to produce the sell price, stored in basis points (100 = 1%). Every game has a resolved markup chosen in this order:

1. a per-client admin override (`markup:override:<clientId>`), else
2. the game's VIP curve (`markup:vip:<game>`), else
3. the game's base markup (`markup:base:<game>`).

A VIP curve is a list of `{ coins, basisPoints }` breakpoints with the first at 0 coins and strictly increasing coins. Markup is interpolated linearly between breakpoints, rounded to the nearest basis point, clamped above the last breakpoint, and must be non-increasing, so more activity never raises the price and there are no cliffs.

**Activity** is the total coins a client consumed in the last 30 days, across all games, from orders with status `DELIVERED`. Refunded, failed and expired orders do not count. The window is a sliding instant (`now − 30 days`), not a calendar month.

## Coin index

The coin index is a dimensionless multiplier that tracks distributor product costs. It starts at `1.0`.

On each successful catalogue sync:

1. For every active product with a previous indexed cost, compute `current cost ÷ previous cost`.
2. Average those ratios with equal weight.
3. Clamp the average move to the configured cap, `coin:index_cap_bps` (default `500`, or 5%).
4. Multiply the index by the clamped ratio.

New products have no previous cost and are skipped on their first appearance. Inactive or delisted products are excluded. The index reads only distributor USD-minor costs; it does not read EGP, the treasury WAC, or the USDT funding rate.

**Coin value** is `index` USD minor. At index `1.0`, one coin is worth 1 cent (0.01 USDT).

The index stabilises the price level, not every product's relative price. A uniform distributor cost change leaves coin prices unchanged up to whole-coin rounding. A change in one product's cost still moves that product's coin price.

## Price chain

```
sell price (USD minor) = distributor cost × (1 + markup bps ÷ 10,000)
coins                  = ceil(sell price minor ÷ coin value minor)
EGP display            = sell price × rate:egp
```

The same chain is used by the storefront and checkout. Checkout recomputes it server-side; a client-supplied price or coin count is ignored. The price guard compares the live distributor cost with the synced cost before checkout proceeds.

## Snapshot

The resolved `markupBasisPoints`, the client's `coinsConsumed`, and the `coinValueMinor` used for the price are stored on the order when it is placed. Later curve, override, cost or index changes do not alter an existing order's price.

## Admin

The dashboard shows the current index, coin value, last index move, cap and a warning when the last move was capped. The dashboard pricing popups edit only the cap; the index itself is computed by sync.
