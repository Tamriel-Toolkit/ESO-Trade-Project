#!/usr/bin/env python3
"""Watch the native ESOTrade SavedVariables file and ingest new scans."""

import os
import sqlite3
import subprocess
import sys
import time
from contextlib import closing
from listing_lifecycle import purge_records, deliver_outbox


sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PARSER_PATH = os.path.join(SCRIPT_DIR, "parse_esotrade_addon.py")
DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))
WATCH_PATHS = [
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
]
PURGE_INTERVAL_SECONDS = 3600
RETRY_INTERVAL_SECONDS = 30
SERVER_URL = os.environ.get("ESOTRADE_SERVER_URL", "http://localhost:5001")


def purge_expired_listings(db_path=DB_PATH):
    """Purge native listing observations whose expiration time has passed."""
    if not os.path.exists(db_path):
        return 0

    try:
        with closing(sqlite3.connect(db_path)) as connection, connection:
            purged = purge_records(connection)
        if purged > 0:
            print(f"[{time.strftime('%H:%M:%S')}] Purged {purged} expired listing observations.")
        return purged
    except Exception as exc:
        print(f"[{time.strftime('%H:%M:%S')}] Listing purge failed: {exc}")
        return 0


def ingest(path):
    print(f"\n[Native scan] Reading {path}...")
    result = subprocess.run([sys.executable, PARSER_PATH, "--file", path, "--server-url", SERVER_URL], check=False)
    if result.returncode != 0:
        print(f"Native parser exited with status {result.returncode}.")


def process_saved_variables_change(path, last_mtimes, ingest_func=ingest):
    """Ingest one external file change and ignore any write made by the parser."""
    try:
        modified_at = os.stat(path).st_mtime_ns
    except FileNotFoundError:
        last_mtimes.pop(path, None)
        return False

    if last_mtimes.get(path) == modified_at:
        return False

    last_mtimes[path] = modified_at
    try:
        ingest_func(path)
    finally:
        # parse_esotrade_addon.py may clear the Scans table after a successful
        # import. Record that post-ingestion write so it cannot trigger a loop.
        try:
            last_mtimes[path] = os.stat(path).st_mtime_ns
        except FileNotFoundError:
            last_mtimes.pop(path, None)
    return True


def start_watching(poll_interval=2, purge_interval=PURGE_INTERVAL_SECONDS):
    print("======================================================")
    print("=== ESOTrade SavedVariables Watcher ===")
    print("======================================================")

    last_mtimes = {}
    purge_expired_listings()
    last_purge_time = time.time()
    last_retry_time = 0

    try:
        while True:
            current_time = time.time()
            if current_time - last_retry_time >= RETRY_INTERVAL_SECONDS:
                try:
                    deliver_outbox(DB_PATH, SERVER_URL)
                except Exception as error:
                    print(f"[Market delivery] Outbox unavailable: {type(error).__name__}; will retry.")
                last_retry_time = current_time
            if current_time - last_purge_time >= purge_interval:
                purge_expired_listings()
                last_purge_time = current_time

            for saved_variables_path in WATCH_PATHS:
                process_saved_variables_change(saved_variables_path, last_mtimes)

            time.sleep(poll_interval)
    except KeyboardInterrupt:
        print("\nWatcher stopped.")


if __name__ == "__main__":
    start_watching()
