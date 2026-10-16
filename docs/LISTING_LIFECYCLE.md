# Guild Trader Listing Lifecycle & Absence Reconciliation Feasibility

This document specifies the evidence-based guild trader listing lifecycle implemented across the `ESOTrade` Lua addon, desktop SavedVariables ingestion pipeline, and central Express/SQLite API (`#118`), as well as the formal feasibility determination on full-trader absence reconciliation (`#144`).

---

## 1. Evidence-Based Listing Lifecycle (`#118`)

All live marketplace listings originate from native in-game observations captured via `EVENT_TRADING_HOUSE_RESPONSE_RECEIVED` in [`addon/ESOTrade/ESOTrade.lua`](../addon/ESOTrade/ESOTrade.lua) and synchronized through [`backend/data-pipeline/parse_esotrade_addon.py`](../backend/data-pipeline/parse_esotrade_addon.py), [`backend/data-pipeline/listing_lifecycle.py`](../backend/data-pipeline/listing_lifecycle.py), [`backend/listing_lifecycle.js`](../backend/listing_lifecycle.js), and [`backend/listing_lifecycle.sql`](../backend/listing_lifecycle.sql).

### Identity & Storage Model
- **Per-Listing `Id64` Identity (`native_listing_observations`)**: Every guild store listing in ESO has a unique 64-bit listing identifier (`itemUniqueId`), normalized via `Id64ToString(uid)` in Lua and validated as a 64-bit unsigned integer string (`1` to `18446744073709551615`) in Python and Node.js so JavaScript `Number` precision loss cannot occur.
- **Scoped Immutability**: Observations are keyed by `(server, uid)` and bound to their originating `guild_id` and immutable listing attributes (`game_item_id`, `seller_name`, `total_price`, `quantity`, `level`, `quality`, `trait_id`). Repeat observations of the same `(server, uid)` update `observed_at` and `expires_at` only when `excluded.observed_at > native_listing_observations.observed_at`, preventing delayed or out-of-order replays from rolling back freshness or duplicating stack counts.
- **Derived Marketplace Read View (`guild_trader_active_listings`)**: Public marketplace search, deal recommendations, watchlists, build slot matching, and trait research queries read from `guild_trader_active_listings`, which groups active, non-tombstoned, non-expired UID observations into `active_stacks` counts while preserving exact `total_price` and unit `price` (`total_price * 1.0 / quantity`).
- **Catalog-Gap Recovery (`native_listing_catalog_pending`) & Durable Delivery (`native_listing_outbox`)**: Observations referencing an item ID not yet present in the local `items` table are durably staged in `native_listing_catalog_pending` and automatically promoted once the UESP catalog is refreshed. Remote uploads to `POST /api/market/upload-scans` are queued transactionally in `native_listing_outbox` before `ESOTrade.lua` SavedVariables are cleared on disk.

### Positive-Evidence Removal Rules
A recorded listing observation is removed from `guild_trader_active_listings` **only** when one of three positive conditions is met:
1. **Confirmed In-Game Purchase (`native_listing_tombstones`)**:
   - `ESOTrade.lua` post-hooks `SetPendingItemPurchase` (keyboard/gamepad index selection), `SetPendingItemPurchaseByItemUniqueId` (AwesomeGuildStore UID selection), `ClearPendingItemPurchase`, and `ConfirmPendingItemPurchase`.
   - A purchase record is written to `ESOTradeVars.Purchases` **only** when `EVENT_TRADING_HOUSE_RESPONSE_RECEIVED` fires with `responseType == TRADING_HOUSE_RESULT_PURCHASE_PENDING` and `result == TRADING_HOUSE_RESULT_SUCCESS` within 60 seconds for the matching megaserver and active `guildId`, with no ambiguous concurrent confirmation.
   - Cancelled dialogs, errors, timeouts, guild switches, and trading-house closures clear pending purchase context without recording a tombstone.
   - On ingestion, confirmed purchases insert a `(server, uid)` tombstone into `native_listing_tombstones` and delete the matching row from `native_listing_observations`. Tombstones prevent stale or replayed observations from resurrecting a purchased UID.
2. **Reported ESO Listing Expiry (`expires_at`)**:
   - Each observation records ESO's remaining listing duration (`timeRemaining` from `GetTradingHouseSearchResultItemInfo`) and computes `expires_at = observed_at + time_remaining`.
   - `guild_trader_active_listings` immediately excludes rows where `expires_at <= strftime('%s', 'now')`, and hourly/import cleanup (`purgeLifecycle` / `purge_records`) physically deletes expired rows.
3. **30-Day Observation Staleness (`RETENTION_SECONDS = 2592000`)**:
   - Any listing whose `observed_at` timestamp is older than 30 days (`2,592,000` seconds) is immediately excluded by `guild_trader_active_listings` and purged during periodic cleanup, including legacy rows with `NULL` expiry.

---

## 2. Feasibility Assessment: Full-Trader Absence Reconciliation (`#144`)

Issue [`#144`](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/144) evaluated whether official ESO trading-house APIs provide sufficiently complete and stable coverage to delete previously observed listings when they are absent from an explicit full-trader scan.

### Primary API & Source Evidence

Review of the official ESO UI source ([`esoui/ingame/tradinghouse/tradinghouse_shared.lua`](https://github.com/esoui/esoui/blob/6639eb2adecc0480557d9068579319919a0c3fe6/esoui/ingame/tradinghouse/tradinghouse_shared.lua), API 101051) and AwesomeGuildStore ([`RequestSearchActivity.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/activity/RequestSearchActivity.lua), [`RequestNewestActivity.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/activity/RequestNewestActivity.lua), [`ItemDatabase.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/database/ItemDatabase.lua), [`SearchPageHistory.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/SearchPageHistory.lua)) establishes three hard limitations in the official ESO client API:

1. **Offset Pagination Without Snapshot Isolation (`ExecuteTradingHouseSearch` / `GetTradingHouseSearchResultsInfo`)**:
   - In `ZO_TradingHouseSearch:DoSearch` (`tradinghouse_shared.lua` lines 441–543), guild store browsing requests one zero-based offset page at a time via `ExecuteTradingHouseSearch(page, self.sortField, self.sortOrder, self.useLastExecutedSearchFilters)`, gated by `GetTradingHouseCooldownRemaining()`, and inspects `numItemsOnPage, currentPage, hasMorePages = GetTradingHouseSearchResultsInfo()`.
   - The ESO server does **not** issue a snapshot token, point-in-time cursor, or immutable result set ID. Every page request is evaluated against live, mutable guild store inventory at the instant the server processes that page.
   - A full guild trader can hold up to 1,500 listings (500 members × 30 listing slots, or up to 50 pages at 30 items/page), requiring ~50–100+ seconds of cooldown-throttled page requests.
   - **Page-Boundary Drift**: If any listing on an already-fetched page (`0 .. P`) is purchased, cancelled by its seller, or expires while the client is waiting on cooldown to request page `P + 1`, all subsequent listings in the sort order shift backward by one index. The listing that occupied slot `1` of page `P + 1` moves into slot `30` of page `P` (which was already read) and is **never returned** on page `P + 1` or any later page. Even if the scanner reaches `hasMorePages == false` without error, that active listing was silently missed.
2. **Write-Only Server Filter State**:
   - Filter configuration functions (`ClearAllTradingHouseSearchTerms()`, `SetTradingHouseFilter(filterType, ...)`, `SetTradingHouseFilterRange(filterType, minValue, maxValue)`, `MatchTradingHouseItemNames(...)`) are write-only C-API calls.
   - When `EVENT_TRADING_HOUSE_RESPONSE_RECEIVED` fires for `TRADING_HOUSE_RESULT_SEARCH_PENDING`, the ESO API provides no getter or response metadata confirming which filter predicates or `useLastExecutedSearchFilters` state the server actually applied to produce the current page.
3. **AwesomeGuildStore Caching & Background Activity Contention**:
   - AwesomeGuildStore overrides global `GetTradingHouseSearchResultItemInfo` and `GetTradingHouseSearchResultItemLink` (`ItemDatabase.lua` lines 34–52) and dispatches asynchronous queued searches (`RequestSearchActivity`, `RequestNewestActivity`) that call `ClearAllTradingHouseSearchTerms()` and `ExecuteTradingHouseSearch(self.pendingPage, SortOrderBase.SORT_FIELD_TIME_LEFT, SortOrderBase.SORT_ORDER_DOWN)`.
   - Crucially, AwesomeGuildStore's own local cache (`ItemDatabase:Update` in `ItemDatabase.lua` lines 73–97 and `SearchPageHistory:SetStateHasNoMorePages` in `SearchPageHistory.lua` lines 64–68) **only inserts or updates observed `itemUniqueId` records and never deletes unseen items when a search reaches `hasMore == false`**.

### Formal Feasibility Decision

**Result: Negative — Full-trader absence-based deletion is unsupported by current official ESO APIs and remains disabled.**

- Completing pages (`hasMorePages == false`) or receiving an empty result set (`numItemsOnPage == 0`) is **not** proof that unreturned UIDs were sold or cancelled.
- Reconciling absence from multi-page scans would cause false-positive deletions of active guild trader listings whenever concurrent purchases, cancellations, expiries, filter changes, or third-party addon activities occur during pagination—directly violating **Critical System Constraint #2 (Search Criteria Guarantee)** in [`.agents/AGENTS.md`](../.agents/AGENTS.md).
- All browsing—including unfiltered, filtered, text-matched, saved-search, AwesomeGuildStore `RequestNewestActivity`, and manually paginated sessions through the final page—remains strictly **observation-only**. Listings are removed solely through confirmed UID purchase tombstones, reported ESO listing expiry (`observed_at + time_remaining`), or the 30-day observation staleness limit.
