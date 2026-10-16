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

Review of the official ESO UI source ([`esoui/ingame/tradinghouse/tradinghouse_shared.lua`](https://github.com/esoui/esoui/blob/6639eb2adecc0480557d9068579319919a0c3fe6/esoui/ingame/tradinghouse/tradinghouse_shared.lua), [`esoui/ingame/tradinghouse/keyboard/tradinghouse_keyboard.lua`](https://github.com/esoui/esoui/blob/6639eb2adecc0480557d9068579319919a0c3fe6/esoui/ingame/tradinghouse/keyboard/tradinghouse_keyboard.lua), [`esoui/ingame/tradinghouse/tradinghousenamesearchfeature_shared.lua`](https://github.com/esoui/esoui/blob/6639eb2adecc0480557d9068579319919a0c3fe6/esoui/ingame/tradinghouse/tradinghousenamesearchfeature_shared.lua), [`esoui/ingame/guild/zo_guildutils_common.lua`](https://github.com/esoui/esoui/blob/6639eb2adecc0480557d9068579319919a0c3fe6/esoui/ingame/guild/zo_guildutils_common.lua), API 101051) and AwesomeGuildStore ([`RequestSearchActivity.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/activity/RequestSearchActivity.lua), [`RequestNewestActivity.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/activity/RequestNewestActivity.lua), [`ItemDatabase.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/database/ItemDatabase.lua), [`SearchPageHistory.lua`](https://github.com/sirinsidiator/ESO-AwesomeGuildStore/blob/master/src/backend/SearchPageHistory.lua)) establishes three critical limitations in the official ESO client API:

1. **Page-Based Search Without an Established Snapshot or Completeness Guarantee (`ExecuteTradingHouseSearch` / `GetTradingHouseSearchResultsInfo`)**:
   - In `ZO_TradingHouseSearch:DoSearch` (`tradinghouse_shared.lua` lines 441–543), guild store browsing requests one zero-based page at a time via `ExecuteTradingHouseSearch(page, self.sortField, self.sortOrder, self.useLastExecutedSearchFilters)`, gated by `GetTradingHouseCooldownRemaining()`, and inspects `numItemsOnPage, currentPage, hasMorePages = GetTradingHouseSearchResultsInfo()`.
   - The reviewed ESO client source exposes only page-based requests and per-page result metadata; it does not reveal the server's internal consistency implementation, and no client-visible snapshot token, point-in-time cursor, or result-set completeness guarantee is established across pages.
   - **Storage Capacity vs. Unverified Search-Result Caps**: A guild can hold up to `MAX_GUILD_MEMBERS` (`500` members in `zo_guildutils_common.lua`) × per-member `maxListings` from `GetTradingHouseListingCounts()` (`tradinghouse_keyboard.lua` line 750; `30` listing slots per member) = **15,000 theoretical member listing slots** (or **500 pages** at 30 results per page), with each page transition throttled by `GetTradingHouseCooldownRemaining()`. The public client Lua source does not expose any server-side search-result cap or guarantee that a single search can enumerate all 15,000 potential listings without truncation, and item-name filter searches explicitly truncate when `GetNumMatchTradingHouseItemNamesResults(id) > GetMaxTradingHouseFilterExactTerms(TRADING_HOUSE_FILTER_TYPE_NAME_HASH)` (`SI_TRADING_HOUSE_SEARCH_TRUNCATED` in `tradinghousenamesearchfeature_shared.lua` lines 36–41, 79–83).
   - **Unruled-Out Page-Boundary Shift Scenario**: Because no server snapshot or completeness contract is established, the client cannot rule out or detect page-boundary shifting during cooldown-throttled pagination. In that failure scenario, if a listing on an already-fetched page (`0 .. P`) is purchased, cancelled, or expires before page `P + 1` is served, subsequent listings in the sort order can shift backward across the page boundary into page `P` and never appear on page `P + 1` or later pages—even when the search reaches `hasMorePages == false` without error.
2. **Write-Only Server Filter State**:
   - Filter configuration functions (`ClearAllTradingHouseSearchTerms()`, `SetTradingHouseFilter(filterType, ...)`, `SetTradingHouseFilterRange(filterType, minValue, maxValue)`, `MatchTradingHouseItemNames(...)`) are write-only C-API calls.
   - When `EVENT_TRADING_HOUSE_RESPONSE_RECEIVED` fires for `TRADING_HOUSE_RESULT_SEARCH_PENDING`, the ESO API provides no getter or response metadata confirming which filter predicates or `useLastExecutedSearchFilters` state the server actually applied to produce the current page.
3. **AwesomeGuildStore Caching & Background Activity Contention**:
   - AwesomeGuildStore overrides global `GetTradingHouseSearchResultItemInfo` and `GetTradingHouseSearchResultItemLink` (`ItemDatabase.lua` lines 34–52) and dispatches asynchronous queued searches (`RequestSearchActivity`, `RequestNewestActivity`) that call `ClearAllTradingHouseSearchTerms()` and `ExecuteTradingHouseSearch(self.pendingPage, SortOrderBase.SORT_FIELD_TIME_LEFT, SortOrderBase.SORT_ORDER_DOWN)`.
   - Crucially, AwesomeGuildStore's own local cache (`ItemDatabase:Update` in `ItemDatabase.lua` lines 73–97 and `SearchPageHistory:SetStateHasNoMorePages` in `SearchPageHistory.lua` lines 64–68) **only inserts or updates observed `itemUniqueId` records and never deletes unseen items when a search reaches `hasMore == false`**.

### Formal Feasibility Decision

**Result: Negative — No reliable snapshot or completeness guarantee was established in the official ESO trading-house APIs, so full-trader absence-based deletion remains unsafe and disabled.**

- Completing pages (`hasMorePages == false`) or receiving an empty result set (`numItemsOnPage == 0`) does **not** establish that unreturned UIDs were sold or cancelled.
- Enabling absence-based deletion without a verified snapshot and completeness guarantee risks false-positive deletions of active guild trader listings (for example, under unverified server result caps, filter/activity contention, or page-boundary shifts during pagination)—directly violating **Critical System Constraint #2 (Search Criteria Guarantee)** in [`.agents/AGENTS.md`](../.agents/AGENTS.md).
- All browsing—including unfiltered, filtered, text-matched, saved-search, AwesomeGuildStore `RequestNewestActivity`, and manually paginated sessions through the final page—remains strictly **observation-only**. Listings are removed solely through confirmed UID purchase tombstones, reported ESO listing expiry (`observed_at + time_remaining`), or the 30-day observation staleness limit.
