"""Disposable SQLite/SavedVariables fixtures and simulated HTTP; no live data."""
import io
import json
import os
import sqlite3
import tempfile
import time
import unittest
import urllib.error
from contextlib import closing
from pathlib import Path
from unittest import mock

import listing_lifecycle as lifecycle
import parse_esotrade_addon as parser
import watcher


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eso-lifecycle-tests-")
        self.addCleanup(self.temp.cleanup)
        self.db = str(Path(self.temp.name) / "test.db")
        self.saved = Path(self.temp.name) / "ESOTrade.lua"
        self.now = int(time.time())
        self.connection = sqlite3.connect(self.db)
        self.addCleanup(self.connection.close)
        self.connection.executescript("""
            CREATE TABLE items (game_item_id INTEGER PRIMARY KEY);
            INSERT INTO items VALUES (123);
            CREATE TABLE guild_trader_listings (
                id INTEGER PRIMARY KEY, game_item_id INTEGER, item_name TEXT, server TEXT,
                seller_name TEXT, price REAL, total_price INTEGER, quantity INTEGER, active_stacks INTEGER,
                guild_name TEXT, location TEXT, level INTEGER, quality INTEGER, trait_id INTEGER,
                expires_at TEXT, discovered_at TEXT
            );
        """)
        lifecycle.ensure_schema(self.connection)
        patch = mock.patch.object(parser, "DEFAULT_DB_PATH", self.db)
        patch.start(); self.addCleanup(patch.stop)
        patch = mock.patch.dict(os.environ, {"ESOTRADE_AUTH_TOKEN": ""})
        patch.start(); self.addCleanup(patch.stop)
        patch = mock.patch("sys.stdout", io.StringIO())
        patch.start(); self.addCleanup(patch.stop)

    def scan(self, uid="101", captured=None, remaining=86400):
        captured = self.now if captured is None else captured
        expiry_field = '' if remaining is None else f', ["TimeRemaining"] = {remaining}'
        return (f'{{ ["UID"] = "{uid}", ["GuildId"] = "88", ["ItemId"] = 123, ["Name"] = "Test Item", '
                f'["Price"] = 744, ["Qty"] = 200, ["Seller"] = "@Test", ["Guild"] = "Test Guild", '
                f'["Time"] = {captured}, ["Trait"] = 3{expiry_field} }}')

    def import_file(self, scans=(), purchases=()):
        content = ('ESOTradeVars = { ["Scans"] = {' + ','.join(scans) + '}, ["Purchases"] = {'
                   + ','.join(purchases) + '}, ["Gear"] = {}, ["TraitResearch"] = {} }')
        self.saved.write_text(content, encoding="utf-8")
        parser.parse_and_sync_esotrade(str(self.saved))
        return content

    def purchase(self, uid="101"):
        return f'{{ ["UID"] = "{uid}", ["GuildId"] = "88", ["Time"] = {self.now} }}'

    def active(self):
        return self.connection.execute("SELECT active_stacks, price, total_price FROM guild_trader_active_listings").fetchall()

    def outbox_count(self):
        return self.connection.execute("SELECT COUNT(*) FROM native_listing_outbox").fetchone()[0]

    def test_partial_searches_and_reloads_preserve_individual_stacks(self):
        self.import_file([self.scan("101"), self.scan("102"), self.scan("103")])
        self.import_file([self.scan("101")])
        self.import_file([self.scan("101"), self.scan("102")])
        self.assertEqual([(3, 3.72, 744)], self.active())
        self.assertEqual(3, self.connection.execute("SELECT COUNT(*) FROM native_listing_observations").fetchone()[0])

    def test_purchase_only_and_stale_scan_replay_are_idempotent(self):
        self.import_file([self.scan("101"), self.scan("102")])
        self.import_file([], [self.purchase()])
        self.import_file([], [self.purchase()])
        self.import_file([self.scan("101")])
        self.assertEqual([(1, 3.72, 744)], self.active())
        self.assertEqual(1, self.connection.execute("SELECT COUNT(*) FROM native_listing_tombstones").fetchone()[0])
        self.assertIn('["Purchases"] = {}', self.saved.read_text(encoding="utf-8"))

    def test_age_and_eso_remaining_time_do_not_refresh_on_delayed_import(self):
        self.import_file([self.scan(captured=self.now - 3600, remaining=3700)])
        self.assertEqual((self.now - 3600, self.now + 100), self.connection.execute("SELECT observed_at, expires_at FROM native_listing_observations").fetchone())
        self.import_file([self.scan(captured=self.now - 7200, remaining=2592000)])
        self.assertEqual((self.now - 3600, self.now + 100), self.connection.execute("SELECT observed_at, expires_at FROM native_listing_observations").fetchone())
        self.import_file([self.scan("102", captured=self.now - 2592001, remaining=None)])
        self.assertEqual(1, self.connection.execute("SELECT COUNT(*) FROM native_listing_observations").fetchone()[0])

    def test_watcher_removes_30_day_native_and_unknown_expiry_legacy_rows(self):
        self.import_file([self.scan(remaining=None)])
        self.connection.execute("UPDATE native_listing_observations SET observed_at = ?", (self.now - 2592001,))
        self.connection.execute("INSERT INTO guild_trader_listings (id, discovered_at) VALUES (1, datetime('now', '-31 days'))")
        self.connection.commit()
        self.assertEqual([], self.active())
        self.assertEqual(2, watcher.purge_expired_listings(self.db))
        self.assertEqual(0, self.connection.execute("SELECT COUNT(*) FROM native_listing_observations").fetchone()[0])
        self.assertEqual(0, self.connection.execute("SELECT COUNT(*) FROM guild_trader_listings").fetchone()[0])

    def test_outbox_survives_file_clear_and_restart_and_only_deletes_on_exact_ack(self):
        self.import_file([self.scan()])
        self.assertIn('["Scans"] = {}', self.saved.read_text(encoding="utf-8"))
        self.assertEqual(1, self.outbox_count())
        # A fresh process can retry from disk; no SavedVariables rewrite needed.
        def lost_ack(request, **kwargs):
            raise TimeoutError("server committed, response lost")
        lifecycle.deliver_outbox(self.db, "https://example.invalid", "test-token", lost_ack, self.now)
        self.assertEqual(1, self.outbox_count())
        calls = []
        def acknowledged(request, **kwargs):
            calls.append(json.loads(request.data))
            return io.BytesIO(b'{"success":true,"lifecycle_version":1,"accepted":1}')
        self.assertEqual(0, lifecycle.deliver_outbox(self.db, "https://example.invalid", "test-token", acknowledged, self.now + 29))
        self.assertEqual(1, lifecycle.deliver_outbox(self.db, "https://example.invalid", "test-token", acknowledged, self.now + 30))
        self.assertEqual(self.now, calls[0]["observations"][0]["observed_at"])
        self.assertEqual(0, self.outbox_count())

    def test_auth_rate_limit_and_bad_ack_leave_durable_records_without_retry_storm(self):
        self.import_file([], [self.purchase()])
        unauthorized = mock.Mock(side_effect=urllib.error.HTTPError("https://example.invalid", 401, "Unauthorized", {}, None))
        lifecycle.deliver_outbox(self.db, "https://example.invalid", "old-token", unauthorized, self.now)
        lifecycle.deliver_outbox(self.db, "https://example.invalid", "old-token", unauthorized, self.now + 3600)
        self.assertEqual(1, unauthorized.call_count)
        limited = mock.Mock(side_effect=urllib.error.HTTPError("https://example.invalid", 429, "Limit", {"Retry-After": "120"}, None))
        lifecycle.deliver_outbox(self.db, "https://example.invalid", "new-token", limited, self.now + 60)
        lifecycle.deliver_outbox(self.db, "https://example.invalid", "new-token", limited, self.now + 179)
        self.assertEqual(1, limited.call_count)
        bad_ack = mock.Mock(side_effect=lambda *a, **k: io.BytesIO(b'{"success":true}'))
        lifecycle.deliver_outbox(self.db, "https://example.invalid", "new-token", bad_ack, self.now + 180)
        self.assertEqual(1, self.outbox_count())
        self.assertNotIn("token", self.connection.execute("SELECT last_error FROM native_listing_outbox").fetchone()[0])

    def test_database_or_queue_failure_retains_whole_file_and_rolls_back(self):
        content = 'ESOTradeVars = { ["Scans"] = {' + self.scan() + '} }'
        self.saved.write_text(content, encoding="utf-8")
        with mock.patch.object(parser, "queue_records", side_effect=sqlite3.OperationalError("disk full")):
            with self.assertRaisesRegex(RuntimeError, "Scans were retained"):
                parser.parse_and_sync_esotrade(str(self.saved))
        self.assertEqual(content, self.saved.read_text(encoding="utf-8"))
        self.assertEqual([], self.active())
        self.assertEqual(0, self.outbox_count())

    def test_changed_source_and_invalid_purchase_are_not_cleared(self):
        self.saved.write_text('ESOTradeVars = { ["Scans"] = {' + self.scan() + '} }', encoding="utf-8")
        self.assertFalse(parser.reset_esotrade_scans_on_disk(str(self.saved), expected_content="old snapshot"))
        content = 'ESOTradeVars = { ["Purchases"] = { { ["UID"] = "0", ["Time"] = 1000 } } }'
        self.saved.write_text(content, encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "Scans were retained"):
            parser.parse_and_sync_esotrade(str(self.saved))
        self.assertEqual(content, self.saved.read_text(encoding="utf-8"))

    def test_inconsistent_uid_attributes_and_negative_remaining_time_fail_closed(self):
        self.import_file([self.scan()])
        for scan in (self.scan().replace('["Qty"] = 200', '["Qty"] = 1'), self.scan(remaining=-1)):
            content = 'ESOTradeVars = { ["Scans"] = {' + scan + '} }'
            self.saved.write_text(content, encoding="utf-8")
            with self.assertRaisesRegex(RuntimeError, "Scans were retained"):
                parser.parse_and_sync_esotrade(str(self.saved))
            self.assertEqual(content, self.saved.read_text(encoding="utf-8"))
        self.assertEqual([(1, 3.72, 744)], self.active())

    def test_expired_outbox_work_is_not_sent_and_missing_auth_stays_quiet(self):
        self.import_file([self.scan(captured=self.now - 2592001, remaining=None)])
        network = mock.Mock()
        self.assertEqual(0, lifecycle.deliver_outbox(self.db, "https://example.invalid", "", network, self.now))
        self.assertEqual(1, self.outbox_count())
        self.assertEqual(0, lifecycle.deliver_outbox(self.db, "https://example.invalid", "test-token", network, self.now))
        network.assert_not_called()
        self.assertEqual(0, self.outbox_count())

    def test_megaservers_keep_same_uid_separate_and_route_purchase_correctly(self):
        na = self.scan().replace('["GuildId"]', '["Server"] = "NA", ["GuildId"]')
        eu = self.scan().replace('["GuildId"]', '["Server"] = "EU", ["GuildId"]')
        self.import_file([na, eu])
        self.assertEqual(2, self.connection.execute("SELECT COUNT(*) FROM native_listing_observations").fetchone()[0])
        self.import_file([], [self.purchase().replace('["GuildId"]', '["Server"] = "EU", ["GuildId"]')])
        self.assertEqual([("NA",)], self.connection.execute("SELECT server FROM guild_trader_active_listings").fetchall())
        payloads = [json.loads(row[0]) for row in self.connection.execute("SELECT payload FROM native_listing_outbox")]
        self.assertEqual("EU", next(payload for payload in payloads if "purchases" in payload)["server"])

    def test_failed_atomic_clear_preserves_source_and_leaves_no_staged_file(self):
        content = 'ESOTradeVars = { ["Scans"] = {' + self.scan() + '}, ["PlayerName"] = "Test Hero" }'
        self.saved.write_text(content, encoding="utf-8")
        with mock.patch.object(parser.os, "replace", side_effect=PermissionError("game is writing")):
            self.assertFalse(parser.reset_esotrade_scans_on_disk(str(self.saved), expected_content=content))
        self.assertEqual(content, self.saved.read_text(encoding="utf-8"))
        self.assertEqual([], list(Path(self.temp.name).glob('.esotrade-clear-*')))


if __name__ == "__main__":
    unittest.main()
