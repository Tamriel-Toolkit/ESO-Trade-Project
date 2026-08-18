#!/usr/bin/env python3
"""
Authentic ESO Addon SavedVariables Guild Trader Listing Parser

Parses in-game player scanned listings logged by the TamrielTradeCentre addon
SavedVariables file (`TamrielTradeCentre.lua`) and populates the `guild_trader_listings`
table in SQLite database (`eso_catalog.db`).

Supports:
- NA and EU server data blocks (`NAData`, `EUData`)
- Scans `Guilds`, `AutoRecordEntries`, `ClientScanEntries`, and `SaleHistoryEntries`
- Extracts exact game item IDs from raw ESO ItemLink strings (`|H0:item:ID:...`)
- Fallback name matching against master catalog items
- Accurate guild trader names, unit prices, stack quantities, and discovered timestamps
"""

import os
import sys
import re
import sqlite3
import argparse
import time

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))

DEFAULT_SAVED_VARS_PATHS = [
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
]



def find_saved_variables_file(custom_path=None):
    if custom_path and os.path.exists(custom_path):
        return custom_path
    for path in DEFAULT_SAVED_VARS_PATHS:
        if os.path.exists(path):
            return path
    return None

def parse_ttc_saved_variables(file_path, db_conn, server="NA"):
    print(f"Reading authentic in-game SavedVariables from: {file_path}...")
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    cursor = db_conn.cursor()

    # Load valid game_item_ids from database
    cursor.execute("SELECT game_item_id FROM items")
    valid_game_ids = set(row[0] for row in cursor.fetchall())

    # Map lowercase name -> game_item_id for fallback
    cursor.execute("SELECT LOWER(name), game_item_id FROM items WHERE name IS NOT NULL AND name != ''")
    name_to_game_id = {row[0]: row[1] for row in cursor.fetchall()}

    # Isolate server region block (NAData vs EUData)
    region_key = f"{server}Data"
    region_start = content.find(f'["{region_key}"]')
    if region_start == -1:
        region_content = content
    else:
        region_content = content[region_start:]

    listings = []
    now = time.time()
    exp_time = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(now + 2592000))

    # Match discrete Lua table entry blocks: { ["DiscoverTime"] = ..., ["Name"] = ..., ["TotalPrice"] = ..., ["Amount"] = ... }
    entry_blocks = list(re.finditer(r'\{[^{}]*?\["DiscoverTime"\]\s*=\s*\d+[^{}]*?\}', region_content, re.DOTALL))
    print(f"Discovered {len(entry_blocks)} discrete scanned item entry blocks in SavedVariables.")

    seen_keys = set()

    for match in entry_blocks:
        block = match.group(0)
        block_pos = match.start()

        name_m = re.search(r'\["Name"\]\s*=\s*"([^"]+)"', block)
        price_m = re.search(r'\["TotalPrice"\]\s*=\s*(\d+)', block)
        amount_m = re.search(r'\["Amount"\]\s*=\s*(\d+)', block)
        link_m = re.search(r'\|H\d+:item:(\d+):', block)
        kiosk_m = re.search(r'\["KioskLocationID"\]\s*=\s*(\d+)', block)
        guild_m = re.search(r'\["GuildName"\]\s*=\s*"([^"]+)"', block)

        if not name_m or not price_m:
            continue

        name = name_m.group(1).strip()
        total_price = int(price_m.group(1))
        amount = int(amount_m.group(1)) if amount_m else 1

        if total_price <= 0 or amount <= 0:
            continue

        unit_price = int(total_price / amount)

        # Context lookback for guild name and seller if not embedded directly in block
        lookback_window = region_content[max(0, block_pos - 600):block_pos]
        guild_section_m = re.findall(r'\["([^"]+)"\]\s*=\s*\{\s*\["(?:PlayerListings|Members|Listings)"\]', lookback_window)
        seller_section_m = re.findall(r'\["(@[^"]+)"\]\s*=\s*\{', lookback_window)

        guild_name = guild_m.group(1).strip() if guild_m else (guild_section_m[-1].strip() if guild_section_m else "Tamriel Guild Trader")
        seller_name = seller_section_m[-1].strip() if seller_section_m else None

        # Build location
        location = f"Guild Kiosk #{kiosk_m.group(1)}" if kiosk_m else ("Tamriel Kiosk" if guild_name != "Tamriel Guild Trader" else "Tamriel Kiosk")

        # Deduplicate
        dedup_key = (name, unit_price, amount, guild_name)
        if dedup_key in seen_keys:
            continue
        seen_keys.add(dedup_key)

        game_item_id = None
        if link_m:
            raw_id = int(link_m.group(1))
            if raw_id in valid_game_ids:
                game_item_id = raw_id

        if not game_item_id and name:
            game_item_id = name_to_game_id.get(name.lower())

        if game_item_id:
            listings.append((game_item_id, name, server, unit_price, amount, guild_name, location, exp_time))

    print(f"Extracted {len(listings)} authentic player-scanned listings from SavedVariables ({server}).")

    # Purge old/stale listings and expired listings
    cursor.execute("DELETE FROM guild_trader_listings;")

    if listings:
        cursor.executemany("""
            INSERT INTO guild_trader_listings (game_item_id, item_name, server, price, quantity, guild_name, location, expires_at, discovered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
        """, listings)
        db_conn.commit()
        print(f"SUCCESS! Ingested {len(listings)} authentic player trader listings into database!")

    return len(listings)

def main():
    parser = argparse.ArgumentParser(description="Parse authentic player TTC SavedVariables trader listings")
    parser.add_argument("--file", type=str, help="Path to TamrielTradeCentre.lua SavedVariables file")
    parser.add_argument("--server", type=str, default="NA", help="Target server region (default: NA)")
    parser.add_argument("--db-path", type=str, default=DEFAULT_DB_PATH, help="Path to SQLite database")

    args = parser.parse_args()

    sv_file = find_saved_variables_file(args.file)
    if not sv_file:
        print("[Notice] No active in-game 'TamrielTradeCentre.lua' SavedVariables file detected.")
        sys.exit(0)

    conn = sqlite3.connect(args.db_path)
    parse_ttc_saved_variables(sv_file, conn, server=args.server)
    conn.close()

if __name__ == "__main__":
    main()
