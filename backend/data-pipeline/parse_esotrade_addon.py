#!/usr/bin/env python3
"""
Custom ESOTrade Native Addon SavedVariables Parser & Sync Engine

Parses `ESOTrade.lua` SavedVariables logged by our custom `ESOTrade` in-game addon.
Sends JSON scan payloads to the central backend endpoint (`POST /api/market/upload-scans`).
"""

import os
import sys
import re
import sqlite3
import json
import time
import urllib.request
import ssl

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))

SAVED_VARS_PATHS = [
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
]

def find_esotrade_savedvars():
    for p in SAVED_VARS_PATHS:
        if os.path.exists(p):
            return p
    return None

def parse_and_sync_esotrade(file_path=None, server_url="http://localhost:5001"):
    sv_file = file_path or find_esotrade_savedvars()
    if not sv_file or not os.path.exists(sv_file):
        print(f"[Notice] No custom 'ESOTrade.lua' SavedVariables file found at: {SAVED_VARS_PATHS}")
        return 0

    print(f"Reading custom ESOTrade SavedVariables from: {sv_file}...")
    with open(sv_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    # Extract items inside ["Scans"] = { ... }
    scans_start = content.find('["Scans"]')
    if scans_start == -1:
        print("[Notice] No Scans table found in ESOTrade.lua yet.")
        return 0

    scans_text = content[scans_start:]
    item_blocks = list(re.finditer(r'\["Link"\]\s*=\s*"([^"]+)"', scans_text))
    print(f"Discovered {len(item_blocks)} custom ESOTrade in-game scanned items!")

    listings = []
    server = "NA"
    if '["Server"] = "EU"' in content:
        server = "EU"

    conn = sqlite3.connect(DEFAULT_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT game_item_id FROM items")
    valid_ids = set(row[0] for row in cursor.fetchall())

    now = time.time()
    exp_time = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(now + 2592000))

    for m in item_blocks:
        start = max(0, m.start() - 50)
        end = min(len(scans_text), m.end() + 400)
        snippet = scans_text[start:end]

        link_m = re.search(r'\|H\d+:item:(\d+):', snippet)
        item_id_m = re.search(r'\["ItemId"\]\s*=\s*(\d+)', snippet)
        price_m = re.search(r'\["Price"\]\s*=\s*(\d+)', snippet)
        qty_m = re.search(r'\["Qty"\]\s*=\s*(\d+)', snippet)
        guild_m = re.search(r'\["Guild"\]\s*=\s*"([^"]+)"', snippet)
        loc_m = re.search(r'\["Location"\]\s*=\s*"([^"]+)"', snippet)

        level_m = re.search(r'\["Level"\]\s*=\s*(\d+)', snippet)
        qual_m = re.search(r'\["Quality"\]\s*=\s*(\d+)', snippet)
        trait_m = re.search(r'\["Trait"\]\s*=\s*(\d+)', snippet)

        raw_link_id = int(link_m.group(1)) if link_m else 0
        raw_table_id = int(item_id_m.group(1)) if item_id_m else 0
        
        item_id = raw_link_id if raw_link_id in valid_ids else (raw_table_id if raw_table_id in valid_ids else 0)
        price = int(price_m.group(1)) if price_m else None
        qty = int(qty_m.group(1)) if qty_m else 1
        guild = guild_m.group(1).strip() if guild_m else "Local Guild Trader"
        location = loc_m.group(1).strip() if loc_m else "Tamriel Trader Kiosk"
        level = int(level_m.group(1)) if level_m else 1
        quality = int(qual_m.group(1)) if qual_m else 1
        trait_id = int(trait_m.group(1)) if trait_m else 0

        if item_id in valid_ids and price and price > 0:
            listings.append({
                "game_item_id": item_id,
                "server": server,
                "price": int(price / qty),
                "quantity": qty,
                "guild_name": guild,
                "location": location,
                "level": level,
                "quality": quality,
                "trait_id": trait_id,
                "expires_at": exp_time
            })

    if listings:
        print(f"Direct Ingesting {len(listings)} custom ESOTrade listings into database...")
        db_tuples = [(l["game_item_id"], l["server"], l["price"], l["quantity"], l["guild_name"], l["location"], l["level"], l["quality"], l["trait_id"], l["expires_at"]) for l in listings]
        cursor.executemany("""
            INSERT INTO guild_trader_listings (game_item_id, server, price, quantity, guild_name, location, level, quality, trait_id, expires_at, discovered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
        """, db_tuples)
        conn.commit()

        # Continuously recalculate real-time market prices for affected items with trimmed outlier filtering
        affected_ids = set(l["game_item_id"] for l in listings)
        for item_id in affected_ids:
            cursor.execute("""
                SELECT price
                FROM guild_trader_listings
                WHERE game_item_id = ? AND server = ? AND price > 0
                ORDER BY price ASC;
            """, (item_id, server))
            rows = cursor.fetchall()
            if rows:
                prices = [r[0] for r in rows]
                min_p = prices[0]
                max_p = prices[-1]
                valid_p = [p for p in prices if p <= max(min_p * 3.5, 100)]
                trimmed_avg = int(sum(valid_p) / len(valid_p))

                cursor.execute("""
                    INSERT INTO item_prices (game_item_id, server, min_price, max_price, avg_price, suggested_price, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(game_item_id, server) DO UPDATE SET
                        min_price = excluded.min_price,
                        max_price = excluded.max_price,
                        avg_price = excluded.avg_price,
                        suggested_price = excluded.suggested_price,
                        last_updated = CURRENT_TIMESTAMP;
                """, (item_id, server, min_p, max_p, trimmed_avg, trimmed_avg))
        conn.commit()

        # Also push to central server API endpoint
        try:
            req = urllib.request.Request(
                f"{server_url}/api/market/upload-scans",
                data=json.dumps({"server": server, "listings": listings}).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as r:
                res_data = json.loads(r.read().decode('utf-8'))
                print("Server API Push Status:", res_data.get("message"))
        except Exception as e:
            print("[Notice] Server API push skipped (running local DB sync):", e)

        print(f"SUCCESS! Ingested {len(listings)} custom ESOTrade listings!")

    conn.close()
    return len(listings)

if __name__ == "__main__":
    parse_and_sync_esotrade()
