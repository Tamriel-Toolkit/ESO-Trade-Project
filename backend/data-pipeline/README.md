# Data Pipeline

The pipeline has two deliberately separate responsibilities: a static UESP catalog and live observations from the native ESOTrade addon.

## Master catalog workflow

Use Python 3.11 with the pipeline requirements installed. Run each acquisition in a new operator-controlled release directory. Keep the normalized artifact, its digest-named manifest and the trusted acquisition log together in release storage.

```sh
cd backend
python3 data-pipeline/fetch_and_ingest.py --output /srv/eso/catalog/releases/RELEASE/items.json
```

Review the reported source range coverage, category counts, missing names and changes against the prior retrieval. Record the printed **manifest SHA-256** in your approved release record. Supply that digest from your release record when importing or restoring. A digest copied from an untrusted file alongside a download cannot establish where it came from.

```sh
python3 data-pipeline/validate_items.py --input /srv/eso/catalog/releases/RELEASE/items.json --manifest-sha256 "$APPROVED_MANIFEST_SHA256"
python3 data-pipeline/populate_sqlite.py --input /srv/eso/catalog/releases/RELEASE/items.json --db /srv/eso/data/eso_catalog.db --manifest-sha256 "$APPROVED_MANIFEST_SHA256"
```

The acquisition command reads the full configured ID range from UESP's HTTPS `minedItemSummary` export. It records every range, upstream response hash, retrieval time, normalization version, artifact hash and category count. UESP exposes no immutable revision for this query. Retaining the acquired files makes the import repeatable. A failed range, duplicate ID, invalid record or unusable full export aborts publication. UESP occasionally returns IDs with no item name. The manifest records those IDs for reconciliation. The importer excludes them from verified membership, preserving any existing linked rows. `--test`, `--limit` and partial ranges produce sample manifests that the importer rejects.

The importer checks the pinned manifest and file, requires at least 140,000 unique named source items across the configured ID range, and verifies categories and the SQLite projection of every imported item. The 140,000 floor detects truncated acquisitions relative to the 155,476-item historical baseline. Review differences at each release. An existing local export without an approved manifest needs a new acquisition before publication.

A single writer transaction publishes item upserts, `catalog_members` and `catalog_manifest` together. An error leaves the previous catalog intact. An item omitted by UESP retains its existing item row and dependent data, outside the current membership. Earlier names for source IDs updated during adoption or refresh appear in `catalog_name_changes` for operator review. Before upgrading a live database, rehearse on a SQLite backup and compare foreign keys and dependent record counts.

```sql
SELECT item_count, category_counts, source_manifest_sha256, catalog_sha256, imported_at
FROM catalog_manifest WHERE id = 1;

SELECT i.game_item_id, i.name FROM items AS i
LEFT JOIN catalog_members AS m USING (game_item_id)
WHERE m.game_item_id IS NULL ORDER BY i.game_item_id;

SELECT game_item_id, prior_name, source_name FROM catalog_name_changes
WHERE source_manifest_sha256 = :approved_manifest_sha256 ORDER BY game_item_id;
```

The acquisition on November 19, 2026 returned 156,164 distinct source IDs. Compared with the historical export, 707 IDs appeared and 19 were absent. Both acquisitions included the same 40 IDs without names. The new verified membership contained 156,124 items. All 21 extra IDs in the audited 155,497-row database matched named items in the new retrieval. These figures describe that acquisition and database.

## Native listing workflow

Run one import:

```bash
python3 data-pipeline/parse_esotrade_addon.py --file "/path/to/ESOTrade.lua"
```

Or continuously watch the standard ESO SavedVariables locations:

```bash
python3 data-pipeline/watcher.py
```

Set `ESOTRADE_AUTH_TOKEN` to the current API token before starting the watcher
when remote API synchronization is required. Without it, native data is still
written to the local SQLite database, but authenticated API pushes are skipped.
The watcher records the parser's post-import auto-clear write and waits for the
next genuine ESO SavedVariables update instead of processing its own write.

Only `ESOTrade.lua` is accepted for live listing observations. Aggregates such as observed minimum, maximum, average, and count are calculated from `guild_trader_listings` at query time.
