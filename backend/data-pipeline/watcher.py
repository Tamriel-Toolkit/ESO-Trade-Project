#!/usr/bin/env python3
"""Watch the native ESOTrade SavedVariables file and ingest new scans."""

import os
import sqlite3
import subprocess
import sys
import time


sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PARSER_PATH = os.path.join(SCRIPT_DIR, "parse_esotrade_addon.py")
DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))
WATCH_PATHS = [
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
]
PURGE_INTERVAL_SECONDS = 3600


def purge_expired_listings(db_path=DB_PATH):
    """Purge native listing observations whose expiration time has passed."""
    if not os.path.exists(db_path):
        return 0

    try:
        with sqlite3.connect(db_path) as connection:
            cursor = connection.execute(
                "DELETE FROM guild_trader_listings "
                "WHERE expires_at IS NOT NULL AND datetime(expires_at) < datetime('now');"
            )
            purged = cursor.rowcount
        if purged > 0:
            print(f"[{time.strftime('%H:%M:%S')}] Purged {purged} expired listing observations.")
        return purged
    except Exception as exc:
        print(f"[{time.strftime('%H:%M:%S')}] Listing purge failed: {exc}")
        return 0


def ingest(path):
    print(f"\n[Native scan] Reading {path}...")
    result = subprocess.run([sys.executable, PARSER_PATH, "--file", path], check=False)
    if result.returncode != 0:
        print(f"Native parser exited with status {result.returncode}.")


def start_watching(poll_interval=2, purge_interval=PURGE_INTERVAL_SECONDS):
    print("======================================================")
    print("=== ESOTrade SavedVariables Watcher ===")
    print("======================================================")

    last_mtimes = {}
    purge_expired_listings()
    last_purge_time = time.time()

    try:
        while True:
            current_time = time.time()
            if current_time - last_purge_time >= purge_interval:
                purge_expired_listings()
                last_purge_time = current_time

            for saved_variables_path in WATCH_PATHS:
                if not os.path.exists(saved_variables_path):
                    continue
                modified_at = os.path.getmtime(saved_variables_path)
                if saved_variables_path not in last_mtimes or modified_at > last_mtimes[saved_variables_path]:
                    last_mtimes[saved_variables_path] = modified_at
                    ingest(saved_variables_path)

            time.sleep(poll_interval)
    except KeyboardInterrupt:
        print("\nWatcher stopped.")


if __name__ == "__main__":
    start_watching()
