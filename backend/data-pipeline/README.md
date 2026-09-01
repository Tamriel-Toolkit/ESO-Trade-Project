# Data Pipeline

The pipeline has two deliberately separate responsibilities: a static UESP catalog and live observations from the native ESOTrade addon.

## Master catalog workflow

```bash
cd backend
python3 data-pipeline/fetch_and_ingest.py
python3 data-pipeline/validate_items.py
python3 data-pipeline/populate_sqlite.py
```

`fetch_and_ingest.py` writes `exports/items.json` with item identity, taxonomy, set information, metadata, and source icon paths. `populate_sqlite.py` then upserts rows by `game_item_id` in one transaction. It never drops the `items` table, so foreign-key-linked user data and native listings survive refreshes.

Use `--input` and `--db` with `populate_sqlite.py` to target alternate files.

## Native listing workflow

Run one import:

```bash
python3 data-pipeline/parse_esotrade_addon.py --file "/path/to/ESOTrade.lua"
```

Or continuously watch the standard ESO SavedVariables locations:

```bash
python3 data-pipeline/watcher.py
```

Only `ESOTrade.lua` is accepted for live listing observations. Aggregates such as observed minimum, maximum, average, and count are calculated from `guild_trader_listings` at query time.
