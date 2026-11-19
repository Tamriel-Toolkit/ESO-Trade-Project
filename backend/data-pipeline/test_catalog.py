"""Private, disposable evidence for UESP provenance, rollback and identity preservation."""
from collections import Counter
from contextlib import closing, redirect_stdout
import hashlib
import io
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import catalog_manifest as provenance
from fetch_and_ingest import acquire, fetch_chunk
from populate_sqlite import populate_database


class CatalogImportTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix="eso-catalog-tests-")
        self.addCleanup(temp.cleanup)
        self.db = Path(temp.name) / "catalog.db"
        self.export = Path(temp.name) / "items.json"
        self.proof = Path(temp.name) / "manifest.json"
        self.enterContext(patch.object(provenance, "MIN_ITEMS", 2))
        self.import_items([self.item(101, "Original"), self.item(102, "Unchanged")])
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            # A destructive delete/reinsert would cascade into these dependent records.
            conn.execute("""CREATE TABLE guild_trader_listings (
                listing_uid TEXT PRIMARY KEY, game_item_id INTEGER REFERENCES items ON DELETE CASCADE,
                total_price INTEGER, quantity INTEGER)""")
            conn.execute("CREATE TABLE character_gear (id INTEGER PRIMARY KEY, game_item_id INTEGER REFERENCES items ON DELETE CASCADE)")
            conn.execute("CREATE TABLE tombstones (listing_uid TEXT PRIMARY KEY, observed_at TEXT)")
            conn.execute("INSERT INTO guild_trader_listings VALUES ('18446744073709551615', 101, 1001, 7)")
            conn.execute("INSERT INTO tombstones VALUES ('18446744073709551614', '2026-10-01T00:00:00Z')")
            conn.execute("INSERT INTO character_gear VALUES (1, 101)")
            conn.commit()

    @staticmethod
    def item(item_id, name):
        return {"game_item_id": item_id, "name": name, "category": "Weapons", "subcategory": "Bow",
                "item_type": "Weapon", "rarity": 4, "metadata": {"set": {"name": "Catalog fixture"}},
                "icon_url": "https://esoicons.uesp.net/esoui/art/icons/fixture.dds"}

    def stage(self, items):
        self.export.write_bytes(json.dumps(items).encode())
        ranges = [{"start_id": provenance.FIRST_ID, "end_id": provenance.LAST_ID,
                   "count": len(items), "raw_sha256": "1" * 64}]
        return {"manifest_version": 1, "normalization_version": 1, "result": "complete",
                "source_url": provenance.SOURCE_URL, "source_table": "minedItemSummary",
                "retrieved_at": "2026-10-01T00:00:00+00:00", "retrieval_id": provenance.retrieval_id(ranges),
                "source_ranges": ranges, "unnamed_item_ids": [], "artifact_sha256": provenance.file_sha256(self.export),
                "item_count": len(items), "category_counts": dict(Counter(row.get("category") for row in items))}

    def import_proof(self, manifest):
        self.proof.write_bytes(json.dumps(manifest).encode())
        with redirect_stdout(io.StringIO()):
            populate_database(self.export, self.db, manifest_path=self.proof,
                              manifest_sha256=provenance.file_sha256(self.proof))

    def import_items(self, items):
        self.import_proof(self.stage(items))

    def snapshot(self):
        with closing(sqlite3.connect(self.db)) as conn:
            return {table: conn.execute(f"SELECT * FROM {table} ORDER BY 1").fetchall()
                    for table in ("items", "guild_trader_listings", "character_gear", "tombstones",
                                  "catalog_manifest", "catalog_members", "catalog_name_changes")}

    def test_repeat_upsert_preserves_relationships_and_omitted_items(self):
        before = self.snapshot()
        update = [self.item(101, "Updated"), self.item(103, "Added")]
        self.import_items(update)
        once = self.snapshot()
        self.import_items(update)
        again = self.snapshot()
        # Repeat imports can have distinct import timestamps.
        for table in set(once) - {"catalog_manifest"}:
            self.assertEqual(once[table], again[table])
        self.assertEqual([101, 102, 103], [row[0] for row in once["items"]])
        self.assertEqual([(101,), (103,)], once["catalog_members"])
        self.assertEqual(("Original", "Updated"), once["catalog_name_changes"][0][-2:])
        for table in ("guild_trader_listings", "character_gear", "tombstones"):
            self.assertEqual(before[table], once[table])

    def test_invalid_record_late_in_export_leaves_previous_catalog_untouched(self):
        before = self.snapshot()
        rows = [self.item(i, "Catalog fixture") for i in range(101, 5101)]
        rows.append(dict(self.item(5101, "Missing ID"), game_item_id=False))
        with self.assertRaises(ValueError):
            self.import_items(rows)
        self.assertEqual(before, self.snapshot())

    def test_sql_failure_rolls_back_previous_rows_and_manifest(self):
        before = self.snapshot()
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute("CREATE TRIGGER reject_fixture BEFORE INSERT ON items WHEN NEW.game_item_id = 103 BEGIN SELECT RAISE(ABORT, 'fixture failure'); END")
        with self.assertRaises(sqlite3.IntegrityError):
            self.import_items([self.item(101, "Must roll back"), self.item(103, "Rejected")])
        self.assertEqual(before, self.snapshot())

    def test_wrong_pin_missing_proof_and_damaged_export_leave_db_unchanged(self):
        before = self.snapshot()
        proof = self.stage([self.item(101, "New"), self.item(102, "Still here")])
        self.proof.write_bytes(json.dumps(proof).encode())
        digest = provenance.file_sha256(self.proof)
        for pin, path in [(None, self.proof), ("0" * 64, self.proof), (digest, self.proof.with_name("absent"))]:
            with self.assertRaises((ValueError, FileNotFoundError)):
                populate_database(self.export, self.db, manifest_path=path, manifest_sha256=pin)
        self.export.write_bytes(b'[{"truncated":')
        with self.assertRaisesRegex(ValueError, "verified manifest"):
            self.import_proof(proof)
        self.assertEqual(before, self.snapshot())

    def test_rejects_samples_bad_taxonomy_duplicate_ids_and_incomplete_ranges(self):
        before = self.snapshot()
        rows = [self.item(101, "One"), self.item(102, "Two")]
        for change in ({"result": "sample"}, {"source_ranges": []}, {"category_counts": {}},
                       {"source_url": "https://example.invalid"}, {"unnamed_item_ids": [101]}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.import_proof({**self.stage(rows), **change})
        for bad in (dict(rows[1], category="Unspecified"), rows[0], dict(rows[1], name=" ")):
            with self.assertRaises(ValueError):
                self.import_items([rows[0], bad])
        self.assertEqual(before, self.snapshot())

    def test_short_retrieval_never_replaces_an_existing_export(self):
        before = self.export.read_bytes()
        with patch("fetch_and_ingest.fetch_chunk", side_effect=ValueError("upstream timeout")):
            with self.assertRaisesRegex(ValueError, "upstream timeout"):
                acquire(self.export, 3, 22, 10, 0, 0)
        self.assertEqual(before, self.export.read_bytes())

    def test_complete_retrieval_records_empty_source_rows_and_reproducible_pin(self):
        raw = [{"itemId": 70, "name": "Named"}, {"itemId": 71, "name": ""},
               {"itemId": 72, "name": "Other"}]
        def mock_chunk(first, last):
            rows = raw if first == provenance.FIRST_ID else []
            return rows, hashlib.sha256(json.dumps(rows).encode()).hexdigest()
        with patch("fetch_and_ingest.fetch_chunk", side_effect=mock_chunk), redirect_stdout(io.StringIO()):
            pin = acquire(self.export, provenance.FIRST_ID, provenance.LAST_ID, 10000, 0, 0)
            populate_database(self.export, self.db, manifest_sha256=pin)
        with closing(sqlite3.connect(self.db)) as conn:
            source = json.loads(conn.execute("SELECT source_manifest_json FROM catalog_manifest").fetchone()[0])
            self.assertEqual([71], source["unnamed_item_ids"])
            self.assertEqual(2, source["item_count"])
            self.assertEqual([(70,), (72,)], conn.execute("SELECT * FROM catalog_members ORDER BY 1").fetchall())

    def test_upstream_fails_closed_on_missing_payload_and_incorrect_count(self):
        with patch("fetch_and_ingest.requests.get") as request:
            request.return_value.status_code = 200
            for payload in ({}, {"minedItemSummary": [], "numRecords": 1}):
                request.return_value.json.return_value = payload
                with self.assertRaises(ValueError):
                    fetch_chunk(3, 20, max_retries=1)


if __name__ == "__main__":
    unittest.main()
