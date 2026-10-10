# Database Schema

## Catalog

### `items`

`game_item_id` is the primary key. Catalog-owned columns include `name`, `category`, `subcategory`, `rarity`, `type`, `set_name`, `icon`, `icon_url`, and JSON `metadata`. The catalog pipeline upserts these fields and never drops the table.

## Native market observations

### `guild_trader_listings` (legacy observations)

Stores listing observations captured by the native ESOTrade addon: item, server, seller, unit price (`price`), total stack price (`total_price`), quantity, stack count, guild, location, level, quality, trait, expiration, and discovery time.

Existing aggregates remain readable until their expiry or 30-day age limit. They
are not assigned fabricated ESO UIDs. Legacy aggregate replays do not refresh
discovery time or extend expiry. Install addon 1.7.0 and rescan for UID-based
freshness and purchase removal.

### UID lifecycle tables and active view (#118)

`native_listing_observations` stores one row per `(server, uid)`. ESO Id64s and
guild IDs are strings end to end, never JavaScript floating-point numbers. Each
row retains exact integer stack price, quantity, item/attribute identity,
guild/seller/location, `observed_at` (actual scan epoch seconds), and `expires_at`
(scan time plus ESO's reported seconds remaining; nullable for older captures).
Newer genuine observations refresh time; retries and out-of-order older scans do
not. Contradictory guild or immutable listing attributes reject the whole batch.

`native_listing_tombstones` records confirmed purchases by `(server, uid)`, scoped
to the captured guild. Duplicate purchase reports are idempotent. Tombstones
suppress delayed/replayed observations, even if the purchase arrives first.
They remain for 30 days plus the allowed 5-minute clock skew; events older than
30 days are ignored. A relisting with a different UID remains independent.

`native_listing_groups` contains only identity-free migration markers (not active
listings). Once UIDs take over a seller/price/quantity/attribute group, its old
aggregate cannot double-count or resurrect the group after purchases/cleanup.
Markers are retained across listing deletion for compatibility with old clients.
They carry no available stock, timestamps, or invented listing identifiers.

`guild_trader_active_listings` is the common read model for marketplace results,
counts, observed prices, watchlists, personalized matches, build deals, research
matches and request-board price references. It groups distinct active UIDs by
exact stack total, quantity, seller, guild and item attributes. Each UID expires
independently. Legacy rows are included only until replaced by UID observations.
Its negative aggregate row IDs distinguish native groups from positive legacy
row IDs; these are presentation IDs, **not** ESO listing UIDs.

Expiry and age are filtered at query time, without waiting for cleanup. Both API
and watcher physically delete listings that have expired or were last genuinely
observed **more than 30 days ago**, including legacy NULL-expiry rows. API cleanup
runs after startup and hourly; watcher cleanup runs at startup and hourly. Invalid
or missing legacy discovery dates cannot establish freshness and are removed.

The desktop-only `native_listing_outbox` stores canonical JSON batches, a payload
hash, retry count/due time, error category and an unauthorized-token fingerprint
(never the token itself). Local observations/purchases and queued deliveries
commit in the same transaction before SavedVariables can be cleared. Delivery
is retried independently of file modifications and removed only after an exact
versioned acknowledgement, or when every event is past the 30-day retention
window and cannot affect the marketplace.

Observed minimum, maximum, average, count, and value index are query-time aggregates grouped by `game_item_id` and server. They are not persisted as a second market dataset.

## User-owned data

Accounts and sessions live in `users` and `sessions`. Character state uses `characters`, `knowledge`, `character_gear`, `character_trait_research`, and `user_inventory`. Builds use `builds`, `build_items`, and `user_saved_builds`. Public orders use `trade_requests`; users set the offered gold amount explicitly.

Foreign keys are enabled. Catalog refreshes update item metadata in place so linked rows remain intact.
