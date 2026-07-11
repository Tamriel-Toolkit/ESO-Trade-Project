# ESO Master Item Catalog Pipeline

This directory contains the necessary scripts for acquiring, normalizing, and processing the complete master item catalog for the ESO Trade Project.

## Overview

The platform uses the **`minedItemSummary`** dataset provided by the UESP as its authoritative data source. This dataset represents over 111,000 unique `game_item_id`s discovered directly from the raw ESO game files (`eso0000.dat` -> `EsoExtractData`).

The pipeline is responsible for safely migrating these raw integer definitions into the targeted PostgreSQL schema using human-readable enums and packing variable relationships (like traits, set bonuses, crafting requirements) into `JSONB` metadata.

### The Metadata Schema
The ingest script smartly maps un-normalized fields to prevent information loss:
- **Raw ESO Types**: `type`, `weaponType`, `armorType`, `craftType`, `equipType`, and `bindType` are securely saved under `metadata.raw`.
- **Rarity / Quality**: Dynamically handles quality string ranges (`"1-5"` defaults the base `rarity` to `5` and preserves the range as `metadata.quality_range`).
- **Research Readiness**: Explicitly sets `trait_id`, `trait_description`, and `style_id` for accurate database progression lookups.
- **Sets**: Explicitly stores `metadata.set.id` along with names and set-piece bonuses.

## Workflow

### 1. Acquire the Data (`minedItemSummary.csv`)
Because the public UESP dumps are often behind Cloudflare protections, automated downloads may fail with a 403 Forbidden error.

You can attempt to automate the fetch by running:
```bash
python3 data-pipeline/fetch_and_ingest.py
```
If the automated fetch is blocked, you must manually acquire the dump:
1. Navigate to: `https://esoitem.uesp.net/dump/minedItemSummary.csv`
2. Download the file locally.
3. Move `minedItemSummary.csv` into the `data-pipeline/` directory.

### 2. Run the Normalization Ingest
Once you have the CSV file, generate the fully compliant `items.json` manifest:
```bash
python3 data-pipeline/ingest_mined_summary.py data-pipeline/minedItemSummary.csv
```
*(Optional)* Add a `--limit <int>` flag to ingest a smaller subset of items for testing.
*(Note: `fetch_and_ingest.py` will automatically run this step if it successfully downloads the file.)*

### 3. Validate the Output
Ensure the newly generated JSON file exactly conforms to the required system schema constraints:
```bash
python3 data-pipeline/validate_items.py
```

### Data Flow Diagram
```text
ESO Game Archives (.dat)
       ↓
EsoExtractData (Windows)
       ↓
UESP Database (minedItemSummary)
       ↓
minedItemSummary.csv (HTTP / Cloudflare)
       ↓
data-pipeline/ingest_mined_summary.py
       ↓
exports/items.json -> PostgreSQL ITEM Table
```
