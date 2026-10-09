"""Catalog imports must preserve live data and roll back partially applied batches."""
import io
import json
import sqlite3
import tempfile
import unittest
from contextlib import closing, redirect_stdout
from pathlib import Path

from populate_sqlite import populate_database


class CatalogImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eso-catalog-tests-")
        self.addCleanup(self.temp.cleanup)
        self.db = str(Path(self.temp.name) / "catalog.db")
        self.export = Path(self.temp.name) / "items.json"
        self.import_items([self.item(1, "Original"), self.item(2, "Unchanged")])
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            # ON DELETE CASCADE detects destructive REPLACE/delete-and-insert implementations.
            conn.execute("CREATE TABLE guild_trader_listings (id INTEGER PRIMARY KEY, game_item_id INTEGER REFERENCES items(game_item_id) ON DELETE CASCADE, price REAL)")
            conn.execute("CREATE TABLE character_gear (id INTEGER PRIMARY KEY, game_item_id INTEGER REFERENCES items(game_item_id) ON DELETE CASCADE)")
            conn.execute("INSERT INTO guild_trader_listings VALUES (1, 1, 3.72)")
            conn.execute("INSERT INTO character_gear VALUES (1, 1)")
            conn.commit()

    @staticmethod
    def item(item_id, name):
        return {"game_item_id": item_id, "name": name, "category": "Weapon", "rarity": 4,
                "metadata": {"set": {"name": "Catalog fixture"}}, "icon_url": "/esoui/art/icons/fixture.dds"}

    def import_items(self, items):
        self.export.write_text(json.dumps(items), encoding="utf-8")
        with redirect_stdout(io.StringIO()):
            populate_database(str(self.export), self.db)

    def snapshot(self):
        with closing(sqlite3.connect(self.db)) as conn:
            return {table: conn.execute(f"SELECT * FROM {table} ORDER BY 1").fetchall()
                    for table in ("items", "guild_trader_listings", "character_gear")}

    def test_repeat_upsert_preserves_relationships_and_omitted_items(self):
        before = self.snapshot()
        update = [self.item(1, "Updated"), self.item(3, "Added")]
        self.import_items(update)
        once = self.snapshot()
        self.import_items(update)
        self.assertEqual(once, self.snapshot())
        self.assertEqual([1, 2, 3], [row[0] for row in once["items"]])
        self.assertEqual("Updated", once["items"][0][1])
        self.assertEqual(before["guild_trader_listings"], once["guild_trader_listings"])
        self.assertEqual(before["character_gear"], once["character_gear"])

    def test_invalid_second_batch_rolls_back_first_batch(self):
        before = self.snapshot()
        rows = [self.item(1, "Must roll back")] + [self.item(i, "Batch fixture") for i in range(3, 5002)]
        rows.append({"name": "Missing ID in second batch"})
        with self.assertRaises(KeyError):
            self.import_items(rows)
        self.assertEqual(before, self.snapshot())

    def test_sql_failure_rolls_back_prior_row(self):
        before = self.snapshot()
        with closing(sqlite3.connect(self.db)) as conn:
            conn.execute("CREATE TRIGGER reject_fixture BEFORE INSERT ON items WHEN NEW.game_item_id = 3 BEGIN SELECT RAISE(ABORT, 'fixture failure'); END")
            conn.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            self.import_items([self.item(1, "Must roll back"), self.item(3, "Rejected")])
        self.assertEqual(before, self.snapshot())

    def test_invalid_json_and_non_array_leave_database_unchanged(self):
        before = self.snapshot()
        for content in ('{"truncated":', '{"not": "an array"}'):
            with self.subTest(content=content):
                self.export.write_text(content, encoding="utf-8")
                with redirect_stdout(io.StringIO()), self.assertRaises(ValueError):
                    populate_database(str(self.export), self.db)
                self.assertEqual(before, self.snapshot())


if __name__ == "__main__":
    unittest.main()
