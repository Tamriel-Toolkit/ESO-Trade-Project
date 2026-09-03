#!/usr/bin/env python3
"""Regression tests for ESOTrade SavedVariables watcher feedback handling."""

import io
import os
import sqlite3
import tempfile
import time
import unittest
from contextlib import closing
from unittest import mock

import parse_esotrade_addon
import watcher


class WatcherFeedbackLoopTests(unittest.TestCase):
    def test_listing_uids_keep_three_identical_stack_counts_idempotent(self):
        addon_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), "..", "..", "addon", "ESOTrade", "ESOTrade.lua"
        ))
        with open(addon_path, "r", encoding="utf-8") as addon_file:
            addon_source = addon_file.read()
        self.assertIn("UID      = NormalizeTradingHouseUid(uid)", addon_source)
        handler_source = addon_source[
            addon_source.index("local function OnTradingHouseResponse"):addon_source.index("local function RefreshCharacterData")
        ]
        self.assertLess(
            handler_source.index("responseType ~= TRADING_HOUSE_RESULT_SEARCH_PENDING"),
            handler_source.index("GetTradingHouseSearchResultsInfo()")
        )
        self.assertIn("result ~= TRADING_HOUSE_RESULT_SUCCESS", handler_source)
        self.assertIn("StoreTradingHouseScan(scan)", handler_source)

        with tempfile.TemporaryDirectory() as temp_dir:
            saved_variables = os.path.join(temp_dir, "ESOTrade.lua")
            database = os.path.join(temp_dir, "eso_catalog.db")
            with closing(sqlite3.connect(database)) as connection:
                connection.executescript("""
                    CREATE TABLE items (game_item_id INTEGER PRIMARY KEY);
                    INSERT INTO items (game_item_id) VALUES (123);
                    CREATE TABLE guild_trader_listings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        game_item_id INTEGER,
                        item_name TEXT,
                        server TEXT,
                        seller_name TEXT,
                        price INTEGER,
                        quantity INTEGER,
                        active_stacks INTEGER,
                        guild_name TEXT,
                        location TEXT,
                        level INTEGER,
                        quality INTEGER,
                        trait_id INTEGER,
                        expires_at TEXT,
                        discovered_at TEXT,
                        UNIQUE(game_item_id, server, guild_name, seller_name, price, quantity, level, quality, trait_id)
                    );
                """)

            scan_time = int(time.time())
            scan_rows = []
            repeated_search_page = (
                "listing-uid-1", "listing-uid-2", "listing-uid-3",
                "listing-uid-1", "listing-uid-2", "listing-uid-3",
            )
            for index, uid in enumerate(repeated_search_page, 1):
                scan_rows.append(
                    f'        [{index}] = {{ ["UID"] = "{uid}", ["ItemId"] = 123, '
                    f'["Name"] = "Tide-Born Feathers", ["Price"] = 210000, ["Qty"] = 100, '
                    f'["Guild"] = "Regression Test Guild", ["Seller"] = "@StackSeller", '
                    f'["Location"] = "Regression Trader", ["Level"] = 50, ["Quality"] = 4, '
                    f'["Trait"] = 3, ["Time"] = {scan_time} }},\n'
                )
            content = (
                'ESOTrade_SavedVariables = {\n'
                '    ["Server"] = "NA",\n'
                '    ["Scans"] = {\n'
                + ''.join(scan_rows)
                + '    },\n'
                '}\n'
            )

            with mock.patch.dict(os.environ, {"ESOTRADE_AUTH_TOKEN": ""}), \
                    mock.patch.object(parse_esotrade_addon, "DEFAULT_DB_PATH", database), \
                    mock.patch("sys.stdout", io.StringIO()):
                for _ in range(2):
                    with open(saved_variables, "w", encoding="utf-8") as handle:
                        handle.write(content)
                    self.assertEqual(1, parse_esotrade_addon.parse_and_sync_esotrade(saved_variables))

            with closing(sqlite3.connect(database)) as verification:
                row = verification.execute("""
                    SELECT quantity, active_stacks
                    FROM guild_trader_listings
                    WHERE game_item_id = 123
                """).fetchone()
            self.assertEqual((100, 3), row)

    def test_parser_does_not_rewrite_an_empty_scans_table(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            saved_variables = os.path.join(temp_dir, "ESOTrade.lua")
            original = 'ESOTrade_SavedVariables = {\n    ["Scans"] = {\n    },\n    ["PlayerName"] = "TestHero",\n}\n'
            with open(saved_variables, "w", encoding="utf-8") as handle:
                handle.write(original)

            modified_before = os.stat(saved_variables).st_mtime_ns
            self.assertFalse(parse_esotrade_addon.reset_esotrade_scans_on_disk(saved_variables))
            self.assertEqual(modified_before, os.stat(saved_variables).st_mtime_ns)
            with open(saved_variables, "r", encoding="utf-8") as handle:
                self.assertEqual(original, handle.read())

    def test_parser_clears_nonempty_scans_without_touching_other_data(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            saved_variables = os.path.join(temp_dir, "ESOTrade.lua")
            original = (
                'ESOTrade_SavedVariables = {\n'
                '    ["Scans"] = {\n'
                '        [1] = { ["ItemId"] = 123, ["Price"] = 100 },\n'
                '    },\n'
                '    ["PlayerName"] = "TestHero",\n'
                '}\n'
            )
            with open(saved_variables, "w", encoding="utf-8") as handle:
                handle.write(original)

            self.assertTrue(parse_esotrade_addon.reset_esotrade_scans_on_disk(saved_variables))
            with open(saved_variables, "r", encoding="utf-8") as handle:
                cleared = handle.read()
            self.assertIn('["Scans"] = {}', cleared)
            self.assertIn('["PlayerName"] = "TestHero"', cleared)
            self.assertNotIn('["ItemId"] = 123', cleared)

    def test_watcher_ignores_parser_write_but_detects_next_external_write(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            saved_variables = os.path.join(temp_dir, "ESOTrade.lua")
            with open(saved_variables, "w", encoding="utf-8") as handle:
                handle.write('["Scans"] = { [1] = {} }\n')

            ingested_paths = []

            def fake_ingest(path):
                ingested_paths.append(path)
                with open(path, "w", encoding="utf-8") as handle:
                    handle.write('["Scans"] = {}\n')

            last_mtimes = {}
            self.assertTrue(watcher.process_saved_variables_change(saved_variables, last_mtimes, fake_ingest))
            self.assertFalse(watcher.process_saved_variables_change(saved_variables, last_mtimes, fake_ingest))
            self.assertEqual([saved_variables], ingested_paths)

            previous_mtime = os.stat(saved_variables).st_mtime_ns
            with open(saved_variables, "w", encoding="utf-8") as handle:
                handle.write('["Scans"] = { [2] = {} }\n')
            os.utime(saved_variables, ns=(previous_mtime + 1_000_000, previous_mtime + 1_000_000))

            self.assertTrue(watcher.process_saved_variables_change(saved_variables, last_mtimes, fake_ingest))
            self.assertEqual([saved_variables, saved_variables], ingested_paths)
            self.assertFalse(watcher.process_saved_variables_change(saved_variables, last_mtimes, fake_ingest))
            self.assertEqual([saved_variables, saved_variables], ingested_paths)

    def test_missing_auth_token_does_not_make_api_requests(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            saved_variables = os.path.join(temp_dir, "ESOTrade.lua")
            database = os.path.join(temp_dir, "eso_catalog.db")
            with closing(sqlite3.connect(database)) as connection:
                connection.executescript("""
                    CREATE TABLE items (game_item_id INTEGER PRIMARY KEY);
                    INSERT INTO items (game_item_id) VALUES (123);
                    CREATE TABLE guild_trader_listings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        game_item_id INTEGER,
                        item_name TEXT,
                        server TEXT,
                        seller_name TEXT,
                        price INTEGER,
                        quantity INTEGER,
                        active_stacks INTEGER,
                        guild_name TEXT,
                        location TEXT,
                        level INTEGER,
                        quality INTEGER,
                        trait_id INTEGER,
                        expires_at TEXT,
                        discovered_at TEXT,
                        UNIQUE(game_item_id, server, guild_name, seller_name, price, quantity, level, quality, trait_id)
                    );
                    CREATE TABLE characters (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        name TEXT UNIQUE,
                        class TEXT,
                        level INTEGER,
                        alliance INTEGER,
                        master_crafter_unlocked INTEGER,
                        last_sync_at TEXT
                    );
                    CREATE TABLE character_gear (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        character_id INTEGER,
                        slot_id INTEGER,
                        game_item_id INTEGER,
                        item_name TEXT,
                        item_link TEXT,
                        quality INTEGER,
                        trait_id INTEGER,
                        set_name TEXT,
                        enchantment_description TEXT,
                        item_icon TEXT,
                        trait_name TEXT,
                        trait_description TEXT,
                        armor_rating INTEGER,
                        weapon_power INTEGER,
                        updated_at TEXT,
                        UNIQUE(character_id, slot_id)
                    );
                    CREATE TABLE character_trait_research (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        character_id INTEGER,
                        crafting_type TEXT,
                        equipment_type TEXT,
                        trait_id INTEGER,
                        trait_name TEXT,
                        research_status TEXT,
                        started_at TEXT,
                        completes_at TEXT,
                        updated_at TEXT,
                        UNIQUE(character_id, equipment_type, trait_id)
                    );
                """)
            content = (
                'ESOTrade_SavedVariables = {\n'
                '    ["PlayerName"] = "TestHero",\n'
                '    ["Scans"] = {\n'
                '        [1] = { ["UID"] = "native-test-1", ["ItemId"] = 123, '
                '["Name"] = "Native Test Item", ["Price"] = 100, ["Qty"] = 1, '
                '["Guild"] = "Test Trading Guild", ["Seller"] = "@TestSeller" },\n'
                '    },\n'
                '    ["Gear"] = {\n'
                '        [1] = { ["Slot"] = 0, ["Name"] = "Test Sword" },\n'
                '    },\n'
                '    ["TraitResearch"] = {\n'
                '        [1] = { ["EquipmentType"] = "Sword", ["TraitId"] = 3, '
                '["Status"] = "COMPLETED", ["CraftingType"] = "Blacksmithing" },\n'
                '    },\n'
                '}\n'
            )
            with open(saved_variables, "w", encoding="utf-8") as handle:
                handle.write(content)

            output = io.StringIO()
            with mock.patch.dict(os.environ, {"ESOTRADE_AUTH_TOKEN": ""}), \
                    mock.patch.object(parse_esotrade_addon, "DEFAULT_DB_PATH", database), \
                    mock.patch.object(parse_esotrade_addon.urllib.request, "urlopen") as urlopen, \
                    mock.patch("sys.stdout", output):
                parse_esotrade_addon.parse_and_sync_esotrade(saved_variables)

            urlopen.assert_not_called()
            self.assertIn("Data is committed to the local application database", output.getvalue())
            self.assertIn(
                "SUCCESS! Local SQLite sync committed "
                "(listings=1, characters=1, gear_items=1, trait_records=1)",
                output.getvalue()
            )
            with closing(sqlite3.connect(database)) as verification:
                self.assertEqual(1, verification.execute("SELECT COUNT(*) FROM characters").fetchone()[0])
                self.assertEqual(1, verification.execute("SELECT COUNT(*) FROM character_gear").fetchone()[0])
                self.assertEqual(1, verification.execute("SELECT COUNT(*) FROM character_trait_research").fetchone()[0])
                self.assertEqual(1, verification.execute("SELECT COUNT(*) FROM guild_trader_listings").fetchone()[0])

    def test_commit_failure_rolls_back_and_retains_scans(self):
        class FailingCursor:
            def execute(self, *_args, **_kwargs):
                return self

            def fetchall(self):
                return []

            def fetchone(self):
                return (1,)

        class FailingConnection:
            def __init__(self):
                self.cursor_instance = FailingCursor()
                self.rolled_back = False
                self.closed = False

            def cursor(self):
                return self.cursor_instance

            def commit(self):
                raise sqlite3.OperationalError("simulated commit failure")

            def rollback(self):
                self.rolled_back = True

            def close(self):
                self.closed = True

        with tempfile.TemporaryDirectory() as temp_dir:
            saved_variables = os.path.join(temp_dir, "ESOTrade.lua")
            content = (
                'ESOTrade_SavedVariables = {\n'
                '    ["PlayerName"] = "TestHero",\n'
                '    ["Scans"] = { [1] = { ["ItemId"] = 123, ["Price"] = 100 } },\n'
                '}\n'
            )
            with open(saved_variables, "w", encoding="utf-8") as handle:
                handle.write(content)

            connection = FailingConnection()
            with mock.patch.object(parse_esotrade_addon.sqlite3, "connect", return_value=connection), \
                    mock.patch.dict(os.environ, {"ESOTRADE_AUTH_TOKEN": ""}):
                with self.assertRaisesRegex(RuntimeError, "Scans were retained for retry"):
                    parse_esotrade_addon.parse_and_sync_esotrade(saved_variables)

            self.assertTrue(connection.rolled_back)
            self.assertTrue(connection.closed)
            with open(saved_variables, "r", encoding="utf-8") as handle:
                self.assertEqual(content, handle.read())


if __name__ == "__main__":
    unittest.main()
