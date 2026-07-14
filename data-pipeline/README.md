# ESO Master Item Catalog Pipeline

This directory contains the necessary scripts for acquiring, normalizing, and processing the complete master item catalog for the ESO Trade Project.

## Overview

The platform uses the **`minedItemSummary`** dataset provided by the UESP as its authoritative data source. This dataset represents unique `game_item_id`s discovered directly from the raw ESO game client files and logged in-game.

The pipeline fetches this dataset directly via the UESP JSON API, normalizes the raw fields into human-readable categories, and compiles them into a structured JSON manifest (`exports/items.json`) matching our PostgreSQL target schema layout.

### The Metadata Schema
The ingest script maps raw and dynamic fields into structured metadata to prevent information loss:
- **Raw ESO Types**: `type`, `weapon_type`, `armor_type`, `craft_type`, `equip_type`, and `bind_type` are saved under `metadata.raw`.
- **Rarity / Quality**: Parses quality ranges (like `"1-5"` into base rarity `5` and preserves the range as `metadata.quality_range`).
- **Research Readiness**: Populates `trait_id`, `trait_description`, and `style_id` for accurate progression checks.
- **Sets**: Populates `metadata.set` with the set name, set ID, and a list of all active set bonuses.
- **Furnishing & Stats**: Captures furnishing flags and numeric item statistics (armor, weapon power).

## Workflow

### 1. Acquire and Normalize the Data
The fetch and ingestion are consolidated into a single range-based API scraper. It queries UESP's JSON export API in chunks of 10,000 IDs to assemble the full catalog.

To execute the pipeline:
```bash
python3 data-pipeline/fetch_and_ingest.py
```

#### Custom Options:
* Run a quick test (fetch a small range of IDs):
  ```bash
  python3 data-pipeline/fetch_and_ingest.py --test
  ```
* Fetch custom ranges (e.g. only new item IDs):
  ```bash
  python3 data-pipeline/fetch_and_ingest.py --start-id 260000 --end-id 280000
  ```
* Set an output item limit:
  ```bash
  python3 data-pipeline/fetch_and_ingest.py --limit 1000
  ```

### 2. Validate the Output
Validate that the generated `exports/items.json` conform precisely to the required system schema requirements:
```bash
python3 data-pipeline/validate_items.py
```

### Data Flow Diagram
```text
UESP Database (minedItemSummary)
       ↓ (JSON API / exportJson.php)
data-pipeline/fetch_and_ingest.py (Chunked HTTP Fetcher)
       ↓ (Normalization & Mapping)
exports/items.json
       ↓
PostgreSQL ITEM Table
```
