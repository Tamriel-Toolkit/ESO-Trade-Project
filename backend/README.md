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
| `TRUST_PROXY` | `false` | Express `trust proxy` configuration for reverse-proxy rate limiting (`false`, `1`, `2`, `loopback`, or CIDR subnets). |
| `DB_PATH` | `./exports/eso_catalog.db` | Path to the SQLite database. For production containers, mount a persistent volume. |
| `SESSION_TTL_HOURS` | `168` | Lifetime in hours for SQLite sessions (7 days). |
| `ENABLE_DEV_ENDPOINTS` | `false` | Enables `/api/dev/*` administrative endpoints in development. Strictly blocked in production. |
| `BLAKE_API_TOKEN` / `DEMO_API_TOKEN` | *(auto-generated)* | Optional static token override for development test accounts. |
| `ESOTRADE_AUTH_TOKEN` | *(empty)* | Bearer token used by `parse_esotrade_addon.py` when syncing scans over HTTP to a remote API. |

### Reverse Proxy & Rate Limiting

When deploying behind a reverse proxy (Nginx, Caddy, AWS ALB, Cloudflare):
- Set `TRUST_PROXY=1` (for a single reverse proxy hop) or `TRUST_PROXY=loopback, 10.0.0.0/8` (for container internal networks).
- If `TRUST_PROXY` is unset or `false`, all incoming requests share the proxy's IP address, which causes rate limiters (`generalLimiter` at 100 req/min, `authLimiter` at 10 req/min) to throttle all users globally.
- Direct deployments without an upstream proxy must leave `TRUST_PROXY=false` to prevent attackers from spoofing client IPs via `X-Forwarded-For`.


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
