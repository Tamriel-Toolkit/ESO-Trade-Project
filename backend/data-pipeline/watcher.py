import time
import os
import sqlite3
from fetch_market_data import parse_ttc_lua_content, upsert_market_data, DEFAULT_DB_PATH, CACHE_DIR

WATCH_PATHS = [
    os.path.join(CACHE_DIR, "PriceTableNA.lua"),
    os.path.join(CACHE_DIR, "PriceTableEU.lua"),
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua")
]

def check_and_ingest():
    conn = sqlite3.connect(DEFAULT_DB_PATH)
    processed_any = False

    for path in WATCH_PATHS:
        if os.path.exists(path):
            last_mtime = getattr(check_and_ingest, f"mtime_{hash(path)}", 0)
            current_mtime = os.path.getmtime(path)

            if current_mtime > last_mtime:
                server = "EU" if "EU" in path else "NA"
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Detected updated market file: {path} ({server} server)")
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    records = parse_ttc_lua_content(content, server=server)
                    if records:
                        count = upsert_market_data(conn, records)
                        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Auto-ingested {count} REAL live market records into database!")
                        setattr(check_and_ingest, f"mtime_{hash(path)}", current_mtime)
                        processed_any = True
                except Exception as e:
                    print(f"[Error] Failed to process {path}: {e}")

    conn.close()
    return processed_any

def start_watcher(interval_seconds=10):
    print(f"=== Starting Automated Real-Market Data Watcher Service ===")
    print(f"Monitoring real market files every {interval_seconds} seconds...")
    for p in WATCH_PATHS:
        print(f"  - {p}")
    
    try:
        while True:
            check_and_ingest()
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        print("\nWatcher service stopped.")

if __name__ == "__main__":
    start_watcher()
