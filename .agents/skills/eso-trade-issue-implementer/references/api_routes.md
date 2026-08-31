# API Routes Reference

Route definitions in `backend/server.js` are the source of truth. Use `rg 'app\\.(get|post|put|patch|delete)' backend/server.js` for the current list.

## Catalog and icons

- `GET /api/taxonomy`
- `GET /api/items`
- `GET /api/items/:game_item_id`
- `GET /api/icons/:filename`
- `GET /api/status`

## Native market observations

- `POST /api/listings/sync`
- `GET /api/listings/personalized/:character_id`
- `GET /api/market/listings`
- `POST /api/market/upload-scans`
- `POST /api/market/listings/purge-expired`
- `POST /api/market/dev/clear-listings` (development admin only)

Native listing aggregates are calculated from `guild_trader_listings`. Catalog browsing uses `/api/items`.
