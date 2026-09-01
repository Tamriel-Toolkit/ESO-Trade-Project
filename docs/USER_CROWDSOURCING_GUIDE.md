# Native ESOTrade Scan Guide

Live listing observations come only from the ESOTrade addon.

1. Log into the web app and obtain or configure your API token.
2. In ESO, visit guild traders and let the addon record listings.
3. Exit or reload the game so SavedVariables are written.
4. Locate `ESOTrade.lua` under your ESO `live/SavedVariables` directory.
5. Run `python3 backend/data-pipeline/parse_esotrade_addon.py --file "/path/to/ESOTrade.lua"`, or start `python3 backend/data-pipeline/watcher.py`.
6. Refresh the Marketplace's Native Listings view.

The master catalog is separate. Refresh it with `fetch_and_ingest.py` followed by `populate_sqlite.py`. Item images are fetched by the backend on first use and then served from the local cache.
