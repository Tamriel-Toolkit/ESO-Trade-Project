# Native ESOTrade Scan Guide

Live listing observations come only from the ESOTrade addon.

1. Log into the web app and obtain or configure your API token.
2. Install ESOTrade **1.7.0** from `addon/ESOTrade`, then in ESO visit guild traders and let the addon record listings.
3. Exit or reload the game so SavedVariables are written.
4. Locate `ESOTrade.lua` under your ESO `live/SavedVariables` directory.
5. Run `python3 backend/data-pipeline/parse_esotrade_addon.py --file "/path/to/ESOTrade.lua"`, or start `python3 backend/data-pipeline/watcher.py`.
6. Refresh the Marketplace's Native Listings view.

The master catalog is separate. Refresh it with `fetch_and_ingest.py` followed by `populate_sqlite.py`. Item images are fetched by the backend on first use and then served from the local cache.

## Listing availability

Each scanned listing keeps its real ESO ID, so repeating searches, changing
filters, or reloading does not invent additional stacks. A successful in-game
purchase captured by the addon removes that individual listing after the next
SavedVariables write/import. Opening or cancelling the purchase dialog, failed
purchases, timeouts, and uncorrelated purchase responses do not remove anything.
Keyboard/gamepad index purchases and AwesomeGuildStore's UID-based purchases
are observed through official hooks; the addon never initiates a purchase.

Listings also disappear at their reported ESO expiry, or after **30 days without
a genuine rescan**, whichever comes first. Automated cleanup removes their
stored records hourly while API reads hide them immediately. Purchases made by
players without the addon are not observable: the site is an observations-based
marketplace, not a guarantee that stock is still available. Ordinary filtered or
paged searches never remove listings simply because they were not returned.
Full-trader absence reconciliation is deferred to feasibility issue #144.

## Reliable remote delivery

`ESOTRADE_AUTH_TOKEN` is required when uploading to a separate central API. Set
`ESOTRADE_SERVER_URL` for the watcher, or pass `--server-url` to the importer.
Use HTTPS for a remote deployment; plain HTTP is intended for localhost testing.
Without a token, local SQLite synchronization still works and market deliveries
remain queued on disk. SavedVariables are cleared only after local market records
and that queue are committed; an offline API cannot lose a confirmed purchase.

The watcher retries queued market batches every 30 seconds when due, even if the
file does not change. Temporary failures use increasing delays, rate limits
respect `Retry-After`, and rejected authentication stops retries for that token.
Configure a current token and restart the watcher to resume. Do not delete the
local database/outbox while it contains undelivered work. Replaying a delivery
after a lost acknowledgement does not duplicate stacks or decrement twice.
Gear/research uploads retain their existing behavior; the durable outbox in this
change applies to market observations and purchases.

## Release validation

Before promoting the draft lifecycle change, verify a real trader purchase on
keyboard and gamepad, an AwesomeGuildStore filtered purchase, a failure/cancel,
and a reload/remote retry. Check that only the purchased UID disappears and the
remaining identical stacks stay visible. Also verify how ESO assigns UIDs when
an item is withdrawn and relisted; the implementation fails closed on ambiguous
or contradictory identity and does not assume permanent global UID uniqueness.
The code was checked against ESO's live API 101051 documentation and executed
in a Lua 5.1 test harness, but these checks are not a live-game test.

API references: [ESO API documentation](https://github.com/esoui/esoui/blob/6639eb2adecc0480557d9068579319919a0c3fe6/ESOUIDocumentation.txt),
[stock purchase success handling](https://github.com/esoui/esoui/blob/6639eb2adecc0480557d9068579319919a0c3fe6/esoui/ingame/tradinghouse/tradinghouse_shared.lua),
[AwesomeGuildStore purchase integration](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/activity/PurchaseItemActivity.lua).
