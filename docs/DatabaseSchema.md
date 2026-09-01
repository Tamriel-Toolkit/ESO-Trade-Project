# Database Schema

## Catalog

### `items`

`game_item_id` is the primary key. Catalog-owned columns include `name`, `category`, `subcategory`, `rarity`, `type`, `set_name`, `icon`, `icon_url`, and JSON `metadata`. The catalog pipeline upserts these fields and never drops the table.

## Native market observations

### `guild_trader_listings`

Stores listing observations captured by the native ESOTrade addon: item, server, seller, unit price, quantity, stack count, guild, location, level, quality, trait, expiration, and discovery time.

Observed minimum, maximum, average, count, and value index are query-time aggregates grouped by `game_item_id` and server. They are not persisted as a second market dataset.

## User-owned data

Accounts and sessions live in `users` and `sessions`. Character state uses `characters`, `knowledge`, `character_gear`, `character_trait_research`, and `user_inventory`. Builds use `builds`, `build_items`, and `user_saved_builds`. Public orders use `trade_requests`; users set the offered gold amount explicitly.

Foreign keys are enabled. Catalog refreshes update item metadata in place so linked rows remain intact.
