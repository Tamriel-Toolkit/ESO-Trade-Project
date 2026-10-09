"""Fail-closed SavedVariables checks; no real character files, DB, or network."""
import io
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import parse_esotrade_addon as parser

SQLITE_CONNECT = sqlite3.connect

class ParserFailureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="eso-parser-tests-")
        self.addCleanup(self.temp.cleanup)
        self.saved = Path(self.temp.name) / "ESOTrade.lua"
        self.connect = self.start_patch(mock.patch.object(parser.sqlite3, "connect"))
        self.network = self.start_patch(mock.patch.object(parser.urllib.request, "urlopen"))
        self.start_patch(mock.patch("sys.stdout", io.StringIO()))

    def start_patch(self, patch):
        result = patch.start()
        self.addCleanup(patch.stop)
        return result

    def test_truncated_and_unsupported_strings_preserve_bytes_before_database_access(self):
        malformed = [
            b'', b'not a saved variables file',
            b'ESOTrade_SavedVariables = { ["Scans"] = { [1] = { ["Price"] = 100 }',
            b'ESOTrade_SavedVariables = { ["Scans"] = {}',
            b'ESOTrade_SavedVariables = { ["Name"] = "unterminated }',
            b'ESOTrade_SavedVariables = { ["Scans"] = {} } }',
            b'ESOTrade_SavedVariables = { ["Scans"] = false, ["Gear"] = {} }',
            b'ESOTrade_SavedVariables = { ["Name"] = "Braces {inside}" }',
            b'ESOTrade_SavedVariables = { ["Name"] = "Escaped \\"quote\\"" }',
            b'ESOTrade_SavedVariables = { ["Name"] = "\xff" }',
        ]
        for content in malformed:
            with self.subTest(content=content):
                self.saved.write_bytes(content)
                with self.assertRaisesRegex(RuntimeError, "Scans were retained"):
                    parser.parse_and_sync_esotrade(str(self.saved))
                self.assertEqual(content, self.saved.read_bytes())
        self.connect.assert_not_called()
        self.network.assert_not_called()

    def test_invalid_prices_and_quantities_preserve_whole_batch(self):
        for fields in ('["Price"] = 100, ["Qty"] = 0', '["Price"] = -1',
                       '["Price"] = "broken"', '["Price"] = 12oops',
                       '["Qty"] = 1', '["Price"] = 100, ["Qty"] = -2'):
            with self.subTest(fields=fields):
                content = ('ESOTrade_SavedVariables = { ["Scans"] = { '
                           '[1] = { ["ItemId"] = 123, ["Price"] = 100 }, '
                           '[2] = { ["ItemId"] = 123, ' + fields + ' } } }')
                self.saved.write_text(content, encoding="utf-8")
                with self.assertRaisesRegex(RuntimeError, "Scans were retained"):
                    parser.parse_and_sync_esotrade(str(self.saved))
                self.assertEqual(content, self.saved.read_text(encoding="utf-8"))
        self.connect.assert_not_called()
        self.network.assert_not_called()

    def test_reset_refuses_truncated_table_and_missing_marker(self):
        for content in ('ESOTrade_SavedVariables = { ["Scans"] = { [1] = {}',
                        'ESOTrade_SavedVariables = { ["Gear"] = {} }'):
            self.saved.write_text(content, encoding="utf-8")
            self.assertFalse(parser.reset_esotrade_scans_on_disk(str(self.saved)))
            self.assertEqual(content, self.saved.read_text(encoding="utf-8"))

    def test_missing_file_has_no_side_effects(self):
        self.assertEqual(0, parser.parse_and_sync_esotrade(str(self.saved)))
        self.connect.assert_not_called()
        self.network.assert_not_called()

    def test_real_sqlite_rollback_preserves_committed_rows(self):
        # Use the original connect function despite the no-access preflight spy above.
        conn = SQLITE_CONNECT(":memory:")
        self.addCleanup(conn.close)
        conn.execute("CREATE TABLE example (value INTEGER UNIQUE)")
        conn.execute("INSERT INTO example VALUES (1)")
        conn.commit()
        conn.execute("INSERT INTO example VALUES (2)")

        class FailedCommit:
            def commit(self):
                raise sqlite3.OperationalError("simulated disk failure")

            def rollback(self):
                conn.rollback()

        with self.assertRaisesRegex(RuntimeError, "Scans were retained"):
            parser.commit_local_sync(FailedCommit())
        self.assertEqual([(1,)], conn.execute("SELECT value FROM example").fetchall())


if __name__ == "__main__":
    unittest.main()
