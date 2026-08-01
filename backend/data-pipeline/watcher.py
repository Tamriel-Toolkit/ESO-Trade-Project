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

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PARSER_TTC = os.path.join(SCRIPT_DIR, "parse_saved_variables.py")
PARSER_ESOTRADE = os.path.join(SCRIPT_DIR, "parse_esotrade_addon.py")

WATCH_PATHS = [
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
]

def start_watching(poll_interval=2):
    print("================================================================")
    print("=== REAL-TIME ESO TRADE ADDON & SAVEDVARIABLES WATCHER DAEMON ===")
    print("================================================================")
    
    last_mtimes = {}

    try:
        while True:
            for path in WATCH_PATHS:
                if os.path.exists(path):
                    mtime = os.path.getmtime(path)
                    if path not in last_mtimes:
                        last_mtimes[path] = mtime
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
