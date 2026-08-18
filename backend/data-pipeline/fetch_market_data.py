#!/usr/bin/env python3
"""
ESO Active Market Data Ingestion Pipeline

Downloads, parses, and ingests active market price data (TTC / Market dumps) into
the SQLite catalog database (`item_prices` and `guild_trader_listings` tables).

Features:
- Handles NA & EU servers
- Automated local caching to respect API rate limits (HTTP 429 handling)
- Direct local file ingestion mode (--file)
- Batch SQLite UPSERT operations with index optimization
"""

import os
import sys
import io
import re
import json
import time
import zipfile
import sqlite3
import argparse
import requests

# Default Paths & Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))
CACHE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "cache"))

TTC_URLS = {
    "NA": "https://us.tamrieltradecentre.com/download/PriceTable",
    "EU": "https://eu.tamrieltradecentre.com/download/PriceTable"
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

def parse_ttc_lookup_table(lookup_content, db_conn):
    """
    Parses ItemLookUpTable_EN.lua content and maps TTC internal item IDs to master catalog game_item_ids.
    """
    cursor = db_conn.cursor()
    cursor.execute("SELECT LOWER(name), rarity, game_item_id FROM items WHERE name IS NOT NULL AND name != '' ORDER BY game_item_id ASC")
    name_rarity_to_game_id = {}
    name_first_game_id = {}
    for name_lower, rarity, game_id in cursor.fetchall():
        if (name_lower, rarity) not in name_rarity_to_game_id:
            name_rarity_to_game_id[(name_lower, rarity)] = game_id
        if name_lower not in name_first_game_id:
            name_first_game_id[name_lower] = game_id
    
    lookup_regex = re.compile(r'\["([^"]+)"\]\s*=\s*\{([^}]+?)\}')
    ttc_id_to_game_id = {}
    
    for m in lookup_regex.finditer(lookup_content):
        name_lower = m.group(1).lower()
        sub_content = m.group(2)
        # Extract [sub_key] = ttc_id pairs
        pair_matches = re.findall(r'\[(\d+)\]\s*=\s*(\d+)', sub_content)
        for sub_key, ttc_id_str in pair_matches:
            ttc_id = int(ttc_id_str)
            sub_val = int(sub_key)
            # Match by name and sub_val if valid rarity, or fallback to first game_id
            game_id = name_rarity_to_game_id.get((name_lower, sub_val)) or name_first_game_id.get(name_lower)
            if game_id:
                ttc_id_to_game_id[ttc_id] = game_id

    print(f"Mapped {len(ttc_id_to_game_id)} TTC internal IDs directly to master catalog game_item_ids.")
    return ttc_id_to_game_id

def find_lookup_table_content():
    """
    Finds and reads ItemLookUpTable_EN.lua from cache zips, loose cache files, or addon directories.
    """
    # 1. Check inside PriceTableNA_real.zip or other cache zips
    zip_paths = [
        os.path.join(CACHE_DIR, "PriceTableNA_real.zip"),
        os.path.join(CACHE_DIR, "PriceTable_NA.zip"),
        os.path.join(CACHE_DIR, "PriceTable_NA_live.zip"),
    ]
    for zp in zip_paths:
        if os.path.exists(zp):
            try:
                with zipfile.ZipFile(zp) as z:
                    if "ItemLookUpTable_EN.lua" in z.namelist():
                        print(f"Loaded ItemLookUpTable_EN.lua from zip archive: {os.path.basename(zp)}")
                        return z.read("ItemLookUpTable_EN.lua").decode('utf-8', errors='ignore')
            except Exception:
                pass

    # 2. Check loose file in cache or addon directories
    loose_paths = [
        os.path.join(CACHE_DIR, "ItemLookUpTable_EN.lua"),
        os.path.expanduser("~/Documents/Elder Scrolls Online/live/AddOns/TamrielTradeCentre/ItemLookUpTable_EN.lua"),
        os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/AddOns/TamrielTradeCentre/ItemLookUpTable_EN.lua")
    ]
    for lp in loose_paths:
        if os.path.exists(lp):
            print(f"Loaded ItemLookUpTable_EN.lua from: {lp}")
            with open(lp, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()

    return None

def parse_ttc_lua_content(content, server, lookup_mapping=None):
    """
    Parses TTC PriceTable Lua content and aggregates price metrics per game_item_id.
    Returns list of dicts: [{game_item_id, server, avg_price, min_price, max_price, suggested_price}]
    """
    print(f"Parsing TTC Lua data for {server} server ({len(content)} chars)...")
    
    # Matches strict top-level item entries enforcing quality subtable [0-5] immediately inside
    item_regex = re.compile(r'(?:\["Data"\]=\{|\,)\s*\[(\d+)\]\s*=\s*\{\s*\[[0-5]\]\s*=')
    matches = list(item_regex.finditer(content))
    
    if not matches:
        print(f"[Warning] No item ID matches found in {server} Lua content.")
        return []

    print(f"Found {len(matches)} strict top-level item ID boundaries for {server}.")
    parsed_records = []
    processed_ttc_ids = set()

    for i in range(len(matches)):
        ttc_item_id = int(matches[i].group(1))
        
        # Only process the FIRST top-level occurrence of each TTC Item ID
        if ttc_item_id in processed_ttc_ids:
            continue
        processed_ttc_ids.add(ttc_item_id)

        # Map TTC item ID to authentic ZOS game_item_id using lookup_mapping
        if lookup_mapping:
            game_item_id = lookup_mapping.get(ttc_item_id)
            if not game_item_id:
                continue
        else:
            game_item_id = ttc_item_id

        start_pos = matches[i].end()
        end_pos = matches[i+1].start() if i + 1 < len(matches) else len(content)
        block = content[start_pos:end_pos]

        s_m = re.search(r'\["S"\]\s*=\s*([\d\.]+)', block)
        sa_m = re.search(r'\["SA"\]\s*=\s*([\d\.]+)', block)
        a_m = re.search(r'\["A"\]\s*=\s*([\d\.]+)', block)
        n_m = re.search(r'\["N"\]\s*=\s*([\d\.]+)', block)
        x_m = re.search(r'\["X"\]\s*=\s*([\d\.]+)', block)

        s_val = float(s_m.group(1)) if s_m else None
        sa_val = float(sa_m.group(1)) if sa_m else None
        a_val = float(a_m.group(1)) if a_m else None
        n_val = float(n_m.group(1)) if n_m else None
        x_val = float(x_m.group(1)) if x_m else None

        sug_p = s_val if s_val is not None else (sa_val if sa_val is not None else (n_val if n_val is not None else a_val))
        avg_p = sa_val if sa_val is not None else (s_val if s_val is not None else a_val)
        min_p = n_val if n_val is not None else sug_p
        max_p = x_val if x_val is not None else sug_p

        if sug_p is not None and sug_p > 0:
            parsed_records.append({
                'game_item_id': game_item_id,
                'server': server,
                'avg_price': int(avg_p or sug_p),
                'min_price': int(min_p or sug_p),
                'max_price': int(max_p or sug_p),
                'suggested_price': int(sug_p)
            })

    return parsed_records

def get_zip_content(server, force_download=False, max_cache_age=21600):
    """
    Downloads or retrieves cached zip file for specified server.
    max_cache_age defaults to 6 hours (21,600 seconds).
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(CACHE_DIR, f"PriceTable_{server}.zip")
    
    # Check if fresh cache exists
    if not force_download and os.path.exists(cache_path):
        mtime = os.path.getmtime(cache_path)
        age = time.time() - mtime
        if age < max_cache_age:
            print(f"Using cached Zip file for {server} (age: {age/3600:.1f} hours)...")
            with open(cache_path, "rb") as f:
                return f.read()

    url = TTC_URLS.get(server, TTC_URLS["NA"])
    print(f"Downloading active market data for {server} from {url}...")
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if resp.status_code == 200:
            with open(cache_path, "wb") as f:
                f.write(resp.content)
            print(f"Successfully cached {server} market data zip ({len(resp.content)} bytes).")
            return resp.content
        elif resp.status_code == 429:
            print(f"[Warning] HTTP 429 Rate Limit from {server} server.")
            if os.path.exists(cache_path):
                print("Falling back to existing cached file...")
                with open(cache_path, "rb") as f:
                    return f.read()
            else:
                raise Exception(f"HTTP 429 Rate Limit and no local cache available for {server}.")
        else:
            resp.raise_for_status()
    except Exception as e:
        if os.path.exists(cache_path):
            print(f"[Warning] Download failed ({e}). Falling back to local cache: {cache_path}")
            with open(cache_path, "rb") as f:
                return f.read()
        raise e


def upsert_market_data(db_conn, price_records, listing_records=None):
    """
    Upserts price records and guild trader listings into SQLite database in a transaction.
    """
    cursor = db_conn.cursor()
    cursor.execute("BEGIN IMMEDIATE TRANSACTION;")

    try:
        # 1. Check valid game_item_ids in items table
        cursor.execute("SELECT game_item_id FROM items;")
        valid_item_ids = set(row[0] for row in cursor.fetchall())
        print(f"Loaded {len(valid_item_ids)} master item IDs for validation.")

        valid_prices = [p for p in price_records if p['game_item_id'] in valid_item_ids]
        print(f"Ingesting {len(valid_prices)} validated price records...")

        # Batch upsert item_prices
        cursor.executemany("""
            INSERT INTO item_prices (game_item_id, server, avg_price, min_price, max_price, suggested_price, last_updated)
            VALUES (:game_item_id, :server, :avg_price, :min_price, :max_price, :suggested_price, CURRENT_TIMESTAMP)
            ON CONFLICT(game_item_id, server) DO UPDATE SET
                avg_price = excluded.avg_price,
                min_price = excluded.min_price,
                max_price = excluded.max_price,
                suggested_price = excluded.suggested_price,
                last_updated = CURRENT_TIMESTAMP;
        """, valid_prices)

        # Batch insert guild trader listings if provided
        if listing_records:
            valid_listings = [l for l in listing_records if l['game_item_id'] in valid_item_ids]
            print(f"Ingesting {len(valid_listings)} validated guild trader listings...")
            
            cursor.executemany("""
                INSERT INTO guild_trader_listings (game_item_id, server, price, quantity, guild_name, location, expires_at, discovered_at)
                VALUES (:game_item_id, :server, :price, :quantity, :guild_name, :location, :expires_at, CURRENT_TIMESTAMP);
            """, valid_listings)

        db_conn.commit()
        print("Successfully committed market data transaction to SQLite database!")
        return len(valid_prices)
    except Exception as e:
        db_conn.rollback()
        print(f"[Error] Failed to upsert market data: {e}")
        raise e

def main():
    parser = argparse.ArgumentParser(description="ESO Active Market Data Ingestion Pipeline")
    parser.add_argument("--server", type=str, choices=["NA", "EU", "BOTH"], default="NA", help="Target server (NA, EU, or BOTH)")
    parser.add_argument("--db-path", type=str, default=DEFAULT_DB_PATH, help=f"Path to SQLite database (default: {DEFAULT_DB_PATH})")
    parser.add_argument("--file", type=str, help="Path to local PriceTable Lua file (bypasses network download)")
    parser.add_argument("--force-download", action="store_true", help="Ignore local zip cache and force network download")

    args = parser.parse_args()

    if not os.path.exists(args.db_path):
        print(f"[Error] Database file not found at {args.db_path}. Please initialize catalog first.")
        sys.exit(1)

    conn = sqlite3.connect(args.db_path)

    # 1. Load Item Lookup Table mapping
    lookup_content = find_lookup_table_content()
    lookup_mapping = None
    if lookup_content:
        lookup_mapping = parse_ttc_lookup_table(lookup_content, conn)
    else:
        print("[Warning] ItemLookUpTable_EN.lua not found. Strict ID mapping unavailable.")

    servers = ["NA", "EU"] if args.server == "BOTH" else [args.server]

    for s in servers:
        print(f"\n================ Processing Market Data: {s} ================")
        
        # 1. Direct file input via --file
        if args.file:
            if os.path.exists(args.file):
                print(f"Reading specified local Lua file: {args.file}...")
                with open(args.file, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                price_records = parse_ttc_lua_content(content, server=s, lookup_mapping=lookup_mapping)
                upsert_market_data(conn, price_records)
            else:
                print(f"[Error] Specified file not found: {args.file}")
            continue

        # 2. Check for zip archive with PriceTable in cache
        zip_candidate = os.path.join(CACHE_DIR, f"PriceTable{s}_real.zip")
        if os.path.exists(zip_candidate):
            print(f"Reading from real cached zip archive: {zip_candidate}...")
            with zipfile.ZipFile(zip_candidate) as z:
                lua_name = f"PriceTable{s}.lua"
                if lua_name in z.namelist():
                    content = z.read(lua_name).decode('utf-8', errors='ignore')
                    price_records = parse_ttc_lua_content(content, server=s, lookup_mapping=lookup_mapping)
                    upsert_market_data(conn, price_records)
                    continue

        # 3. Check for auto-detected local PriceTable files in cache or SavedVariables
        auto_paths = [
            os.path.join(CACHE_DIR, f"PriceTable{s}.lua"),
            os.path.join(CACHE_DIR, f"PriceTable_{s}.lua"),
            os.path.expanduser(f"~/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
            os.path.expanduser(f"~/Documents/Elder Scrolls Online/live/AddOns/TamrielTradeCentre/PriceTable{s}.lua"),
            os.path.expanduser(f"~/OneDrive/Documents/Elder Scrolls Online/live/AddOns/TamrielTradeCentre/PriceTable{s}.lua")
        ]
        
        local_found = None
        for p in auto_paths:
            if os.path.exists(p):
                local_found = p
                break

        if local_found:
            print(f"Auto-detected real market export file: {local_found}")
            with open(local_found, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            price_records = parse_ttc_lua_content(content, server=s, lookup_mapping=lookup_mapping)
            upsert_market_data(conn, price_records)
            continue

        # 4. Attempt network fetch
        try:
            zip_bytes = get_zip_content(s, force_download=args.force_download)
            filename = f"PriceTable{s}.lua"
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                if "ItemLookUpTable_EN.lua" in z.namelist() and not lookup_mapping:
                    lk_text = z.read("ItemLookUpTable_EN.lua").decode('utf-8', errors='ignore')
                    lookup_mapping = parse_ttc_lookup_table(lk_text, conn)
                content = z.read(filename).decode('utf-8', errors='ignore')
            
            price_records = parse_ttc_lua_content(content, server=s, lookup_mapping=lookup_mapping)
            upsert_market_data(conn, price_records)
        except Exception as e:
            print(f"[Notice] Network fetch unavailable ({e}). Strict Real-Data Mode enabled: Zero synthetic fallback data generated.")
            print(f"To load real market data, place 'PriceTable{s}.lua' into 'backend/exports/cache/' or run with '--file <path>'.")

    conn.close()
    print("\nMarket data ingestion process completed successfully!")

if __name__ == "__main__":
    main()
