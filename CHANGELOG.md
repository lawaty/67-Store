# Changelog

All notable changes to this project will be documented in this file.

The format follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html): a heading is `## [Unreleased]` for changes not yet released, or `## [MAJOR.MINOR.PATCH]` for a released version.

## [Unreleased]

- Added sky blue as a second accent colour — a brighter --sky plus a new --sky-strong token — carried by the top strip, hero glow, focus states, selection, and informational badges.
- Re-denominated the coin to 1 cent (0.01 USDT) at index 1.0; product coin prices are now 100x and the USD deposit rate is 1 minor per coin.
- Split customer coin deposits into their own `/management/coins` page; the treasury page now shows only the funding form and one merged treasury funding/consumption log.
- Unified clients and moved pricing to activity-based markup (base/VIP curve/override) with admin curve/override controls and a domain-selectable dashboard trend.
- Replaced the coin regime with a capped chained coin index driven by provider cost changes; coin funding cost is now an accounting metric, and orders snapshot the coin value used.
- Reworked the management financial views around a shared visualization grammar: reconciliation bridge, recorded partition, rate ladder, index move bar and product buyability partition, backed by a shared frontend formatter.
- Added a P2P min/average/max strip, a compact sidebar balance partition and the desktop theme switch; removed the coverage display and improved dark-theme contrast and Arabic text spacing.
- Moved WAC into the settlement card, compacted the coin metrics into one card, removed the P2P legend and market-spread comparison, and changed the trend chart to live-cost min/average/max curves, WAC and profit.
- Rewrote the P2P strip as one bar with min/average/max across all ads and hover tooltips, and simplified the dashboard cost card to a single WAC value and market-vs-WAC spread.
- Refactored the USDT state model: total is the live distributor balance (recorded + free), free is total − recorded, and available (recorded − reserved) determines sellable coins and product buyability; pending funding is a process state outside the balance breakdown.
- Funding lots now record only EGP paid and USDT received, and pending funding was removed.
- Dashboard combines the trend chart, performance (orders/coins/profit) and per-client projections under one 7/30/90-day period with pricing popups on the dashboard; P2P observations accumulate by UTC day, the range aggregates a configurable window (default 1 day) with a configurable sync interval (default 300s, minimum 60s), and the P2P card shows the range without an offer count.
- P2P history is hourly with an hours-based aggregation window (default 24h), and the current live point is plotted immediately; `Setting.value` moved to `LONGTEXT` to hold the hourly history.
- Moved the dashboard 7/30/90 control into a shared header above the chart and performance cards, and standardised the management term on WAC.
- Funding lots prefill free USDT and its live Binance max EGP value, reject amounts above free USDT, and funding rows can be rolled back only when recorded USDT, EGP basis and reserved-coin guards pass.
