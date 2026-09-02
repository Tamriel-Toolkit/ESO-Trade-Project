#!/usr/bin/env python3
"""Regression tests for ESOTrade SavedVariables watcher feedback handling."""

import io
import os
import tempfile
import unittest
from unittest import mock

import parse_esotrade_addon
import watcher


class WatcherFeedbackLoopTests(unittest.TestCase):
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
        class FakeCursor:
            def execute(self, *_args, **_kwargs):
                return self

            def fetchall(self):
                return []

            def fetchone(self):
                return (1,)

        class FakeConnection:
            def __init__(self):
                self.cursor_instance = FakeCursor()

            def cursor(self):
                return self.cursor_instance

            def commit(self):
                return None

            def close(self):
                return None

        with tempfile.TemporaryDirectory() as temp_dir:
            saved_variables = os.path.join(temp_dir, "ESOTrade.lua")
            content = (
                'ESOTrade_SavedVariables = {\n'
                '    ["PlayerName"] = "TestHero",\n'
                '    ["Scans"] = {},\n'
                '    ["Gear"] = {\n'
                '        [1] = { ["Slot"] = 0, ["Name"] = "Test Sword" },\n'
                '    },\n'
                '}\n'
            )
            with open(saved_variables, "w", encoding="utf-8") as handle:
                handle.write(content)

            output = io.StringIO()
            with mock.patch.dict(os.environ, {"ESOTRADE_AUTH_TOKEN": ""}), \
                    mock.patch.object(parse_esotrade_addon.sqlite3, "connect", return_value=FakeConnection()), \
                    mock.patch.object(parse_esotrade_addon.urllib.request, "urlopen") as urlopen, \
                    mock.patch("sys.stdout", output):
                parse_esotrade_addon.parse_and_sync_esotrade(saved_variables)

            urlopen.assert_not_called()
            self.assertIn("Remote API sync skipped: ESOTRADE_AUTH_TOKEN is not configured", output.getvalue())


if __name__ == "__main__":
    unittest.main()
