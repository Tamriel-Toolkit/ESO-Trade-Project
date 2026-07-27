#!/usr/bin/env python3
"""
ESO Active Market Data Ingestion Pipeline

Downloads, parses, and ingests active market price data (TTC / Market dumps) into
the SQLite catalog database (`item_prices` and `guild_trader_listings` tables).

Features:
- Handles NA & EU servers
- Automated local caching to respect API rate limits (HTTP 429 handling)
- Direct local file ingestion mode (--file)
- Mock data generation mode (--mock) for offline development & testing
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
import random
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

def parse_ttc_lua_content(content, server):
    """
    Parses TTC PriceTable Lua content and aggregates price metrics per game_item_id.
    Returns list of dicts: [{game_item_id, server, avg_price, min_price, max_price, suggested_price}]
    """
    print(f"Parsing TTC Lua data for {server} server ({len(content)} chars)...")
    
    # Matches top-level item entries:   [game_item_id]={
    item_regex = re.compile(r'^\s*\[(\d+)\]\s*=\s*\{', re.MULTILINE)
    matches = list(item_regex.finditer(content))
    
    if not matches:
        print(f"[Warning] No item ID matches found in {server} Lua content.")
        return []

    print(f"Found {len(matches)} item ID boundaries for {server}.")
    parsed_records = []
    
    for i in range(len(matches)):
        start_idx = matches[i].start()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else content.rfind('}')
        
        block = content[start_idx:end_idx]
        game_item_id = int(matches[i].group(1))

        # Find price sub-dictionaries inside block: ["A"]=..., ["N"]=..., ["X"]=..., ["SA"]=...
        price_dicts = re.findall(r'\{[^{}]*?"A"=[^{}]*?\}', block)
        if not price_dicts:
            continue

        a_vals, x_vals, n_vals, sa_vals = [], [], [], []

        for pdict in price_dicts:
            a = re.search(r'"A"=([\d\.]+)', pdict)
            x = re.search(r'"X"=([\d\.]+)', pdict)
            n = re.search(r'"N"=([\d\.]+)', pdict)
            sa = re.search(r'"SA"=([\d\.]+)', pdict) or re.search(r'"S"=([\d\.]+)', pdict)

            if a: a_vals.append(float(a.group(1)))
            if x: x_vals.append(float(x.group(1)))
            if n: n_vals.append(float(n.group(1)))
            if sa: sa_vals.append(float(sa.group(1)))

        if not a_vals and not n_vals:
            continue

        avg_price = int(sum(a_vals) / len(a_vals)) if a_vals else None
        min_price = int(min(n_vals)) if n_vals else None
        max_price = int(max(x_vals)) if x_vals else None
        suggested_price = int(sum(sa_vals) / len(sa_vals)) if sa_vals else avg_price

        parsed_records.append({
            'game_item_id': game_item_id,
            'server': server,
            'avg_price': avg_price,
            'min_price': min_price,
            'max_price': max_price,
            'suggested_price': suggested_price
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

def generate_mock_market_data(db_conn, count=0, server="NA"):
    """
    Generates realistic, domain-accurate market price & guild listing data for catalog items.
    Enforces realistic price ranges and stackability rules per ESO item category (mats vs equipment vs food).
    """
    print(f"Generating realistic market prices & active listings for catalog items ({server} server)...")
    cursor = db_conn.cursor()

    if count > 0:
        cursor.execute("SELECT game_item_id, name, category, subcategory, rarity FROM items ORDER BY game_item_id LIMIT ?", (count,))
    else:
        cursor.execute("SELECT game_item_id, name, category, subcategory, rarity FROM items ORDER BY game_item_id")
    
    items = cursor.fetchall()
    print(f"Processing {len(items)} items for market pool ({server})...")

    prices = []
    listings = []

    guild_names = ["Traders of Tamriel", "Mournhold Merchants", "Wayrest Trade Syndicate", "Belkarth Bazaar", "Elden Root Exchange", "Craglorn Market", "Vivec City Traders"]
    locations = ["Mournhold, Deshaan", "Wayrest, Stormhaven", "Elden Root, Grahtwood", "Belkarth, Craglorn", "Vivec City, Vvardenfell", "Alinor, Summerset", "Rimmen, Elsweyr"]

    gold_mats = {"Dreugh Wax", "Tempering Alloy", "Rosin", "Kuta", "Perfect Roe", "Aetherial Dust", "Chromium Plating", "Chromium Grains", "Zircon Plating"}
    basic_mats = {"Ancestor Silk", "Rubedite Ore", "Ruby Ash", "Platinum Ounce", "Heartwood", "Mundane Rune", "Bast", "Alchemical Resin", "Decorative Wax", "Raw Ancestor Silk", "Rubedite Ingot"}

    for item_id, name, cat, subcat, rarity in items:
        name_str = name or ""
        cat_str = cat or ""
        subcat_str = subcat or ""
        r = rarity or 1

        # Determine realistic base average price per unit
        if name_str in gold_mats or "Plating" in name_str or "Wax" in name_str and "Crescent" not in name_str and "Paper" not in name_str and "Effigy" not in name_str and "Design" not in name_str:
            if "Dreugh Wax" in name_str or "Tempering Alloy" in name_str or "Rosin" in name_str or "Kuta" in name_str:
                avg = random.randint(14000, 32000)
            elif "Plating" in name_str or "Roe" in name_str or "Dust" in name_str:
                avg = random.randint(22000, 45000)
            else:
                avg = random.randint(1200, 8000)
        elif name_str in basic_mats or "Ore" in name_str or "Silk" in name_str or "Ingot" in name_str or "Rune" in name_str:
            avg = random.randint(15, 75)
        elif "Weapon" in cat_str or "Armor" in cat_str or "Jewelry" in cat_str:
            # Equipment pricing based on rarity tier
            if r <= 1:
                avg = random.randint(250, 1200)
            elif r == 2:
                avg = random.randint(800, 2500)
            elif r == 3:
                avg = random.randint(2000, 7500)
            elif r == 4:
                avg = random.randint(5000, 22000)
            elif r == 5:
                avg = random.randint(15000, 65000)
            else: # Mythic/Artifact
                avg = random.randint(45000, 150000)
        elif "Consumable" in cat_str or "Drink" in subcat_str or "Food" in subcat_str or "Potion" in subcat_str or "Reagent" in subcat_str:
            avg = random.randint(25, 250)
        elif "Motif" in name_str or "Recipe" in name_str or "Design" in name_str or "Formula" in name_str or "Blueprint" in name_str:
            if r >= 4:
                avg = random.randint(12000, 120000)
            else:
                avg = random.randint(400, 4500)
        else:
            avg = random.randint(150, 3500) + (r * 500)

        min_p = int(avg * random.uniform(0.75, 0.90))
        max_p = int(avg * random.uniform(1.10, 1.45))
        sug_p = int(avg * random.uniform(0.93, 1.05))

        prices.append({
            'game_item_id': item_id,
            'server': server,
            'avg_price': avg,
            'min_price': min_p,
            'max_price': max_p,
            'suggested_price': sug_p
        })

        # Determine realistic stack quantity rule
        # Equipment, Motifs, Recipes, Containers CANNOT stack (Quantity = 1)
        if "Weapon" in cat_str or "Armor" in cat_str or "Jewelry" in cat_str or "Motif" in name_str or "Recipe" in name_str or "Design" in name_str or "Blueprint" in name_str:
            possible_quantities = [1]
        elif name_str in basic_mats or "Silk" in name_str or "Ore" in name_str or "Ingot" in name_str:
            possible_quantities = [10, 20, 50, 100, 200]
        elif name_str in gold_mats or "Wax" in name_str or "Rosin" in name_str or "Alloy" in name_str:
            possible_quantities = [1, 2, 5, 10, 20, 50, 100, 200]
        elif "Consumable" in cat_str or "Food" in subcat_str or "Drink" in subcat_str:
            possible_quantities = [1, 2, 5, 10, 20, 50]
        else:
            possible_quantities = [1, 2, 5, 10]

        # Generate active listings for ~35% of market pool items
        if random.random() < 0.35:
            for _ in range(random.randint(1, 4)):
                listings.append({
                    'game_item_id': item_id,
                    'server': server,
                    'price': int(avg * random.uniform(0.70, 1.25)),
                    'quantity': random.choice(possible_quantities),
                    'guild_name': random.choice(guild_names),
                    'location': random.choice(locations),
                    'expires_at': time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(time.time() + random.randint(86400, 2592000)))
                })

    return prices, listings

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
    parser.add_argument("--mock", action="store_true", help="Generate mock market data for testing")
    parser.add_argument("--force-download", action="store_true", help="Ignore local zip cache and force network download")

    args = parser.parse_args()

    if not os.path.exists(args.db_path):
        print(f"[Error] Database file not found at {args.db_path}. Please initialize catalog first.")
        sys.exit(1)

    conn = sqlite3.connect(args.db_path)

    servers = ["NA", "EU"] if args.server == "BOTH" else [args.server]

    for s in servers:
        print(f"\n================ Processing Market Data: {s} ================")
        
        # 1. Direct file input via --file
        if args.file:
            if os.path.exists(args.file):
                print(f"Reading specified local Lua file: {args.file}...")
                with open(args.file, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                price_records = parse_ttc_lua_content(content, server=s)
                upsert_market_data(conn, price_records)
            else:
                print(f"[Error] Specified file not found: {args.file}")
            continue

        # 2. Check for auto-detected local PriceTable files in cache or SavedVariables
        auto_paths = [
            os.path.join(CACHE_DIR, f"PriceTable{s}.lua"),
            os.path.join(CACHE_DIR, f"PriceTable_{s}.lua"),
            os.path.expanduser(f"~/Documents/Elder Scrolls Online/live/SavedVariables/TamrielTradeCentre.lua"),
            os.path.expanduser(f"~/Documents/Elder Scrolls Online/live/AddOns/TamrielTradeCentre/PriceTable{s}.lua")
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
            price_records = parse_ttc_lua_content(content, server=s)
            upsert_market_data(conn, price_records)
            continue

        # 3. Attempt network fetch
        try:
            zip_bytes = get_zip_content(s, force_download=args.force_download)
            filename = f"PriceTable{s}.lua"
            with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
                content = z.read(filename).decode('utf-8', errors='ignore')
            
            price_records = parse_ttc_lua_content(content, server=s)
            upsert_market_data(conn, price_records)
        except Exception as e:
            if args.mock:
                print(f"[Notice] Generating mock dataset for offline development testing...")
                prices, listings = generate_mock_market_data(conn, count=0, server=s)
                upsert_market_data(conn, prices, listings)
            else:
                print(f"[Notice] Network fetch unavailable ({e}). Strict Real-Data Mode enabled: No mock entries inserted.")
                print(f"To load real market data, place 'PriceTable{s}.lua' into 'backend/exports/cache/' or run with '--file <path>'.")

    conn.close()
    print("\nMarket data ingestion process completed successfully!")

if __name__ == "__main__":
    main()
