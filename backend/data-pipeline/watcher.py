#!/usr/bin/env python3
"""
Background SavedVariables File Watcher Daemon for Real-Time Trade Sync

Monitors both:
1. `SavedVariables/ESOTrade.lua` (Our Native Custom ESO Addon)
2. `SavedVariables/TamrielTradeCentre.lua` (Legacy TTC Addon)

Whenever ESO writes scanner data to disk, this watcher automatically
ingests the new trader scans into the central database and pushes to the web API!
"""

import os
import sys
import time
import subprocess
import sqlite3

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PARSER_TTC = os.path.join(SCRIPT_DIR, "parse_saved_variables.py")
PARSER_ESOTRADE = os.path.join(SCRIPT_DIR, "parse_esotrade_addon.py")
DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))

WATCH_PATHS = [
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
]

PURGE_INTERVAL_SECONDS = 3600  # 1 hour

def purge_expired_listings(db_path=DB_PATH):
    """Purges listings past their TTL expires_at timestamp directly from SQLite."""
    if not os.path.exists(db_path):
        return 0
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM guild_trader_listings WHERE expires_at IS NOT NULL AND datetime(expires_at) < datetime('now');")
        purged = cursor.rowcount
        conn.commit()
        conn.close()
        if purged > 0:
            print(f"[{time.strftime('%H:%M:%S')}] [TTL Purge] Purged {purged} expired guild trader listings from database.")
        return purged
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] [TTL Purge Error] Failed to purge expired listings: {e}")
        return 0

def start_watching(poll_interval=2, purge_interval=PURGE_INTERVAL_SECONDS):
    print("================================================================")
    print("=== REAL-TIME ESO TRADE ADDON & SAVEDVARIABLES WATCHER DAEMON ===")
    print("================================================================")
    
    last_mtimes = {}

    # Run initial startup TTL purge
    purge_expired_listings(DB_PATH)
    last_purge_time = time.time()

    try:
        while True:
            current_time = time.time()
            if current_time - last_purge_time >= purge_interval:
                purge_expired_listings(DB_PATH)
                last_purge_time = current_time

            for path in WATCH_PATHS:
                if os.path.exists(path):
                    mtime = os.path.getmtime(path)
                    if path not in last_mtimes:
                        last_mtimes[path] = mtime
                        print(f"\n[Startup Ingestion] Reading {os.path.basename(path)} ({path})...")
                        if "ESOTrade.lua" in path:
                            subprocess.run([sys.executable, PARSER_ESOTRADE, "--file", path])
                        else:
                            subprocess.run([sys.executable, PARSER_TTC, "--file", path])
                    elif mtime > last_mtimes[path]:
                        print(f"\n[File Modified] {os.path.basename(path)} update detected at {time.strftime('%H:%M:%S')}!")
                        if "ESOTrade.lua" in path:
                            subprocess.run([sys.executable, PARSER_ESOTRADE, "--file", path])
                        else:
                            subprocess.run([sys.executable, PARSER_TTC, "--file", path])
                        last_mtimes[path] = mtime
            time.sleep(poll_interval)
    except KeyboardInterrupt:
        print("\nWatcher daemon stopped.")

if __name__ == "__main__":
    start_watching()
