# ESO Master Item Catalog Pipeline

This directory contains the necessary scripts for acquiring, normalizing, and processing the complete master item catalog for the ESO Trade Project.

## Overview

The platform uses the **`minedItemSummary`** dataset provided by the UESP as its authoritative data source. This dataset represents unique `game_item_id`s discovered directly from the raw ESO game client files and logged in-game.

The pipeline fetches this dataset directly via the UESP JSON API, normalizes the raw fields into human-readable categories, and compiles them into a structured JSON manifest (`backend/exports/items.json`) matching our PostgreSQL target schema layout.

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
Validate that the generated `backend/exports/items.json` conform precisely to the required system schema requirements:
```bash
python3 data-pipeline/validate_items.py
```

### Data Flow Diagram
```text
UESP Database (minedItemSummary)
       ↓ (JSON API / exportJson.php)
data-pipeline/fetch_and_ingest.py (Chunked HTTP Fetcher)
       ↓ (Normalization & Mapping)
backend/exports/items.json
       ↓
PostgreSQL ITEM Table
```

## Setting Up a New Instance / Regenerating the Database

If you are setting up a new instance of the application or need to regenerate the catalog and local database:

1. **Install Dependencies**:
   Make sure you have the required libraries installed:
   ```bash
   pip install -r data-pipeline/requirements.txt
   ```

2. **Fetch and Normalize the Catalog**:
   Run the ingestion script to harvest all items directly from the UESP API. This creates the master catalog file (`backend/exports/items.json`):
   ```bash
   python3 data-pipeline/fetch_and_ingest.py
   ```
   *(To run a quick verification instead of the full 155k download, run `python3 data-pipeline/fetch_and_ingest.py --test`)*

3. **Validate the Catalog**:
   Verify that the generated JSON catalog matches the target schema constraints:
   ```bash
   python3 data-pipeline/validate_items.py
   ```

4. **Compile the Relational Database**:
   Run the SQLite populator script to create the SQL tables, build search indexes, and insert all items into a local relational database file (`backend/exports/eso_catalog.db`):
   ```bash
   python3 data-pipeline/populate_sqlite.py
   ```

5. **Test Query Operations**:
   Execute the query test script to verify that relational queries operate correctly:
   ```bash
   python3 data-pipeline/test_db_queries.py
   ```
