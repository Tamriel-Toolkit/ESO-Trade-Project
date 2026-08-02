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

    # Extract Scanner Character Metadata Header
    m_name = re.search(r'\["PlayerName"\]\s*=\s*"([^"]+)"', content)
    m_class = re.search(r'\["PlayerClass"\]\s*=\s*(\d+)', content)
    m_level = re.search(r'\["PlayerLevel"\]\s*=\s*(\d+)', content)
    m_alliance = re.search(r'\["PlayerAlliance"\]\s*=\s*(\d+)', content)
    m_crafter = re.search(r'\["IsMasterCrafter"\]\s*=\s*(\d+)', content)

    player_name = m_name.group(1) if m_name else None
    player_class_id = int(m_class.group(1)) if m_class else 1
    player_level = int(m_level.group(1)) if m_level else 50
    player_alliance = int(m_alliance.group(1)) if m_alliance else 1
    master_crafter = int(m_crafter.group(1)) if m_crafter else 0

    class_names = {1: "Dragonknight", 2: "Sorcerer", 3: "Nightblade", 4: "Warden", 5: "Necromancer", 6: "Templar", 117: "Arcanist"}
    player_class_name = class_names.get(player_class_id, "Dragonknight")

    # Extract only content strictly inside ["Scans"] = { ... } table
    scans_m = re.search(r'\["Scans"\]\s*=\s*\{(.*?)\n\s*\}\s*,', content, flags=re.DOTALL)
    if not scans_m:
        scans_m = re.search(r'\["Scans"\]\s*=\s*\{(.*?)\}', content, flags=re.DOTALL)
    
    scans_text = scans_m.group(1) if scans_m else ""
    item_blocks = list(re.finditer(r'\["Link"\]\s*=\s*"([^"]+)"', scans_text)) if scans_text.strip() else []
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
        scanner_m = re.search(r'\["Scanner"\]\s*=\s*"([^"]+)"', snippet)

        if not player_name and scanner_m:
            player_name = scanner_m.group(1).strip()

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

        if item_id > 0 and price and price > 0:
            listings.append({
                "game_item_id": item_id,
                "price": price,
                "quantity": qty,
                "guild_name": guild,
                "location": location,
                "level": level,
                "quality": quality,
                "trait_id": trait_id,
                "expires_at": exp_time
            })

    affected_ids = set()
    if listings:
        print(f"Direct Ingesting {len(listings)} custom ESOTrade listings into database...")
        for item in listings:
            cursor.execute("""
                INSERT INTO guild_trader_listings 
                (game_item_id, server, price, quantity, guild_name, location, level, quality, trait_id, expires_at, discovered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(game_item_id, server, guild_name, price, quantity, level, quality, trait_id) DO UPDATE SET
                    discovered_at = CURRENT_TIMESTAMP,
                    expires_at = COALESCE(excluded.expires_at, expires_at);
            """, (item["game_item_id"], server, item["price"], item["quantity"], item["guild_name"], item["location"], item["level"], item["quality"], item["trait_id"], item["expires_at"]))
            affected_ids.add(item["game_item_id"])

    # Always auto-discover playing character in local SQLite
    if player_name:
        cursor.execute("""
            INSERT INTO characters (user_id, name, class, level, alliance, master_crafter_unlocked, last_sync_at)
            VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                class = COALESCE(excluded.class, class),
                level = COALESCE(excluded.level, level),
                alliance = COALESCE(excluded.alliance, alliance),
                master_crafter_unlocked = excluded.master_crafter_unlocked,
                last_sync_at = CURRENT_TIMESTAMP;
        """, (player_name, player_class_name, player_level, player_alliance, master_crafter))
        alliance_map = {1: "Aldmeri Dominion", 2: "Ebonheart Pact", 3: "Daggerfall Covenant"}
        alliance_str = alliance_map.get(player_alliance, "Aldmeri Dominion")
        print(f"Synced character '{player_name}' ({player_class_name}, Lvl {player_level}, Alliance: {alliance_str}) to roster!")

        # Recalculate real-time market prices
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

        # Push to central server API endpoint in 500-item chunks
        batch_size = 500
        for b_idx in range(0, len(listings), batch_size):
            chunk = listings[b_idx:b_idx + batch_size]
            try:
                payload = {
                    "server": server,
                    "listings": chunk,
                    "player_name": player_name,
                    "player_class": player_class_name,
                    "player_level": player_level,
                    "player_alliance": player_alliance,
                    "master_crafter": master_crafter
                }
                req = urllib.request.Request(
                    f"{server_url}/api/market/upload-scans",
                    data=json.dumps(payload).encode('utf-8'),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": "Bearer dev-token-blake-123"
                    }
                )
                with urllib.request.urlopen(req, timeout=10) as r:
                    res_data = json.loads(r.read().decode('utf-8'))
                    print(f"  [API Batch {b_idx//batch_size + 1}] Pushed {len(chunk)} items ({res_data.get('message')})")
            except Exception as e:
                print(f"  [Notice] API Push Batch {b_idx//batch_size + 1} skipped:", e)

        print(f"SUCCESS! Ingested {len(listings)} custom ESOTrade listings into database!")

        # Automated SavedVariables Disk Flush: Reset Scans = {} in ESOTrade.lua SavedVariables on disk
        try:
            with open(sv_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            new_content = re.sub(r'(\["Scans"\]\s*=\s*\{).*?(\}\s*,)', r'\1\n\2', content, flags=re.DOTALL)
            if new_content != content:
                with open(sv_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"AUTOMATED FLUSH: Reset {len(listings)} scanned items in {os.path.basename(sv_file)} on disk!")
        except Exception as fe:
            print("[Notice] SavedVariables disk flush notice:", fe)

    conn.close()
    return len(listings)

if __name__ == "__main__":
    parse_and_sync_esotrade()
