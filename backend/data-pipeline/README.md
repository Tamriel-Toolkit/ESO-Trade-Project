# ESO Master Item Catalog & Authentic Market Data Pipeline

This directory contains the streamlined data pipeline for acquiring, normalizing, and processing the complete master item catalog and authentic live market data for the ESO Trade Project.

## Core Scripts Architecture

The data pipeline consists of the following core scripts:

1. **`fetch_and_ingest.py`**:
   - Queries UESP's JSON export API (`minedItemSummary`) to harvest the full 155,000+ item master catalog into `backend/exports/items.json`.

2. **`populate_sqlite.py`**:
   - Compiles `items.json` into the local SQLite database (`backend/exports/eso_catalog.db`).
   - Builds tables (`items`, `item_prices`, `guild_trader_listings`) and search indexes.

3. **`fetch_market_data.py`**:
   - Ingests official Tamriel Trade Centre (`PriceTableNA.lua` / `PriceTableEU.lua`) market archives.
   - Computes and populates authentic price statistics (`avg_price`, `min_price`, `max_price`, `suggested_price`) in `item_prices`.

4. **`live_trader_extractor.py`**:
   - Scrapes 100% REAL live active guild trader listings directly from Tamriel Trade Centre's search portal using Playwright.
   - Supports on-demand search extraction and broad category sweeps (`ItemCategory1ID=1..10`).

5. **`parse_saved_variables.py`**:
   - Parses local in-game player guild trader scans logged by the official TTC addon (`TamrielTradeCentre.lua` SavedVariables file).

6. **`watcher.py`**:
   - Real-time file watcher daemon that monitors `TamrielTradeCentre.lua` and automatically ingests new in-game trader scans into the local database as you play ESO or run the TTC client.

7. **`purge_synthetic_listings.py`**:
   - Utility script to purge any legacy synthetic or test listing entries from `guild_trader_listings`.

---

## Quick Start & Verification

### 1. Run Real-Time Addon Watcher Daemon
```bash
python data-pipeline/watcher.py
```

### 2. Extract Live Kiosk Listings via TTC Search Web Portal
```bash
python data-pipeline/live_trader_extractor.py --limit 35
```

### 3. Verify Database & API Endpoints
```bash
node data-pipeline/test_api_endpoints.js
```
