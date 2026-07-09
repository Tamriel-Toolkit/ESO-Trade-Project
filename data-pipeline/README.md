# ESO Data Pipeline

This directory contains scripts for acquiring and processing the ESO Master Item Catalog.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Ensure you have the source repositories cloned in the root directory:
   - `uesp-esolog`
   - `uesp-esoapps`

## Usage

### 1. Bootstrap the Catalog
Generate the `exports/items.json` file from local source data:
```bash
python3 data-pipeline/generate_items.py [limit]
```
- **limit**: Optional. Number of items to fetch (default is 1000). Set to 0 to fetch all available items.
  - Example: `python3 data-pipeline/generate_items.py 5000` (Fetch 5,000 items)
  - Example: `python3 data-pipeline/generate_items.py 0` (Fetch all items)

### 2. Validate the Catalog
Ensure the generated JSON matches the database schema:
```bash
python3 data-pipeline/validate_items.py
```

### 3. Programmatic Extraction (Optional)
Attempt to fetch specific ID ranges from UESP (Note: may be blocked by Cloudflare):
```bash
python3 data-pipeline/data_extract.py <start_id> <end_id>
```
Example: `python3 data-pipeline/data_extract.py 1 100`

## Data Flow
ESO Game Archives -> EsoExtractData (Windows) -> CSV/PHP Defs -> generate_items.py -> items.json
