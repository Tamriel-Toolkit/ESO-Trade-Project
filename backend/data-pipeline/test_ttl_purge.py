"""Exercise the application's actual expiry triggers in an isolated database."""
import re
import sqlite3
import unittest
from pathlib import Path


class ListingExpiryTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.addCleanup(self.conn.close)
        # Step 0: Ensure schema exists. Only columns used by the production triggers are needed.
        self.conn.execute("CREATE TABLE guild_trader_listings (id INTEGER PRIMARY KEY, expires_at TEXT)")
        # Step 1: Ensure triggers and indexes exist. Read real SQL, not a second test-only implementation.
        source = (Path(__file__).resolve().parents[1] / "server.js").read_text(encoding="utf-8")
        for event in ("insert", "update"):
            match = re.search(
                rf"CREATE TRIGGER IF NOT EXISTS trg_purge_expired_listings_{event}\b.*?END;",
                source, re.DOTALL,
            )
            self.assertIsNotNone(match, f"Production {event} expiry trigger missing")
            self.conn.execute(match.group())

    def test_insert_already_expired_listing(self):
        # Test 1: Insert Already-Expired Listing (Trigger Auto-Purge)
        self.conn.execute("INSERT INTO guild_trader_listings VALUES (1, '2000-01-01 00:00:00')")
        self.assertEqual([], self.conn.execute("SELECT * FROM guild_trader_listings").fetchall())

    def test_active_and_unknown_expiry_persist(self):
        # Test 2: Insert Active Listing (Should Persist)
        self.conn.executemany("INSERT INTO guild_trader_listings VALUES (?, ?)",
                              [(1, "9999-01-01 00:00:00"), (2, None)])
        self.assertEqual([(1,), (2,)], self.conn.execute("SELECT id FROM guild_trader_listings ORDER BY id").fetchall())

    def test_update_to_expired_removes_only_target(self):
        # Test 3: Update Active Listing to Expired Date (Trigger Auto-Purge)
        self.conn.executemany("INSERT INTO guild_trader_listings VALUES (?, ?)",
                              [(1, "9999-01-01 00:00:00"), (2, None)])
        self.conn.execute("UPDATE guild_trader_listings SET expires_at = ? WHERE id = ?", ("2000-01-01 00:00:00", 1))
        self.assertEqual([(2,)], self.conn.execute("SELECT id FROM guild_trader_listings").fetchall())


if __name__ == "__main__":
    unittest.main()
