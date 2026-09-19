# ESO Trade Backend

The Express/SQLite backend serves the master item catalog, local icon cache, accounts, characters, builds, requests, and native guild-trader observations.

## Start

```bash
cd backend
npm install
npm start
```

The default API is `http://localhost:5001`. Set configuration variables in `backend/.env`.

## Environment Configuration

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5001` | Express HTTP server port. |
| `NODE_ENV` | `development` | Runtime mode (`development`, `production`, `test`). In production, enforces secure cookies (`SameSite=None; Secure`), disables dev bypass routes, and bounds CORS. |
| `FRONTEND_URL` | *(empty)* | Public origin of the web client allowed by CORS in production (e.g. `https://esomarketplace.example.com`). |
| `DB_PATH` | `./exports/eso_catalog.db` | Path to the SQLite database. For production containers, mount a persistent volume. |
| `SESSION_TTL_HOURS` | `168` | Lifetime in hours for SQLite sessions (7 days). |
| `ENABLE_DEV_ENDPOINTS` | `false` | Enables `/api/dev/*` administrative endpoints in development. Strictly blocked in production. |
| `BLAKE_API_TOKEN` / `DEMO_API_TOKEN` | *(auto-generated)* | Optional static token override for development test accounts. |
| `ESOTRADE_AUTH_TOKEN` | *(empty)* | Bearer token used by `parse_esotrade_addon.py` when syncing scans over HTTP to a remote API. |

## Data workflows

- `python3 data-pipeline/fetch_and_ingest.py` downloads the static UESP item catalog to `exports/items.json`.
- `python3 data-pipeline/populate_sqlite.py` transactionally upserts that catalog without dropping user-owned data.
- `python3 data-pipeline/parse_esotrade_addon.py --file /path/to/ESOTrade.lua` ingests native in-game listing observations.
- `python3 data-pipeline/watcher.py` watches common `ESOTrade.lua` locations.

## Core routes

- `GET /api/items` — paginated master catalog.
- `GET /api/items/:game_item_id` — one catalog item.
- `GET /api/taxonomy` — catalog categories and subcategories.
- `GET /api/icons/:filename` — validated, cached, same-origin item image.
- `GET /api/market/listings` — native listing observations with on-demand aggregates.
- `POST /api/market/upload-scans` — authenticated native scan upload.
- `GET /api/status` — catalog and listing health summary.

Icon requests accept only a safe PNG basename. The backend downloads from the fixed UESP icon host, caches successful responses in `exports/icon-cache`, and serves a local fallback when the source is unavailable.
