# API Routes Reference — ESO Trade Project

Complete listing of all 32 routes in `backend/server.js` with line numbers,
methods, auth requirements, and database tables touched.

## Catalog & Taxonomy

| Route | Method | Line | Auth | Tables | Notes |
|---|---|---|---|---|---|
| `/api/taxonomy` | GET | 165 | No | items | Returns distinct categories/subcategories |
| `/api/items` | GET | 190 | No | items | Paginated catalog, supports ?search, ?category, ?subcategory, ?rarity |
| `/api/items/:game_item_id` | GET | 264 | No | items, item_prices | Single item detail with pricing |
| `/api/status` | GET | 314 | No | guild_trader_listings, item_prices, characters | System health + counts |

## Character Management

| Route | Method | Line | Auth | Tables | Notes |
|---|---|---|---|---|---|
| `/api/characters` | GET | 336 | Yes | characters | ⚠️ DUPLICATED at line 1693 |
| `/api/characters/sync` | POST | 359 | Yes | characters, knowledge | Batch sync character + known items |
| `/api/characters/:id/profile` | GET | 423 | Yes | characters, character_gear | Full profile with equipped gear |
| `/api/characters/upload-gear` | POST | 471 | Yes | character_gear | Update BAG_WORN slot data |
| `/api/character/:character_id` | GET | 541 | No | items, knowledge | Known catalog items for character |

## Pricing & Market

| Route | Method | Line | Auth | Tables | Notes |
|---|---|---|---|---|---|
| `/api/prices/sync` | POST | 586 | No | item_prices | Batch upsert price aggregates |
| `/api/listings/sync` | POST | 642 | No | guild_trader_listings | Batch upsert active listings |
| `/api/inventory/sync` | POST | 704 | Yes | user_inventory | Sync bag duplicates |
| `/api/listings/personalized/:id` | GET | 768 | No | guild_trader_listings, knowledge, items | Listings for unknown items |
| `/api/market/prices` | GET | 1075 | No | item_prices, items | Price aggregates with metadata |
| `/api/market/listings` | GET | 1187 | No | guild_trader_listings, items | Full filtered listing search |
| `/api/market/listings/extract` | POST | 1317 | No | — | Spawns Python scraper subprocess |
| `/api/market/upload-scans` | POST | 1370 | Yes | guild_trader_listings, characters, item_prices | Crowdsource endpoint — upserts + auto-calculates averages |
| `/api/market/dev/clear-listings` | POST | 1485 | No | guild_trader_listings, item_prices | ⚠️ DEV ONLY: Nukes market data |

## Watchlist

| Route | Method | Line | Auth | Tables | Notes |
|---|---|---|---|---|---|
| `/api/watchlist/:character_id` | GET | 858 | No | watchlists, items | List watched items |
| `/api/watchlist` | POST | 910 | No | watchlists | Add item to watchlist |
| `/api/watchlist/:id/:item_id` | DELETE | 948 | No | watchlists | Remove from watchlist |
| `/api/watchlist/:id/alerts` | GET | 974 | No | watchlists, guild_trader_listings, items | Price alert matches |

## Trades

| Route | Method | Line | Auth | Tables | Notes |
|---|---|---|---|---|---|
| `/api/trades/matches/:character_id` | GET | 1020 | No | knowledge, user_inventory, items | Cross-character trade matching |

## Auth & Admin

| Route | Method | Line | Auth | Tables | Notes |
|---|---|---|---|---|---|
| `/api/auth/register` | POST | 1525 | No | users | Create account |
| `/api/auth/login` | POST | 1554 | No | users | Login |
| `/api/auth/me` | GET | 1584 | Yes | users | Session check |
| `/api/dev/users` | GET | 1607 | No | users | ⚠️ DEV: List all accounts |
| `/api/dev/bypass-login` | POST | 1627 | No | users | ⚠️ DEV: Passwordless login |
| `/api/dev/users/:id` | PUT | 1653 | No | users | ⚠️ DEV: Edit account |
| `/api/dev/users/:id` | DELETE | 1678 | No | users, characters | ⚠️ DEV: Delete account |

## Character Manager (Duplicate Section)

| Route | Method | Line | Auth | Tables | Notes |
|---|---|---|---|---|---|
| `/api/characters` | GET | 1693 | Yes | characters | ⚠️ DUPLICATE of line 336 |
| `/api/characters` | POST | 1716 | Yes | characters | Upsert character metadata |
| `/api/characters/:id` | DELETE | 1745 | Yes | characters | Delete character |
