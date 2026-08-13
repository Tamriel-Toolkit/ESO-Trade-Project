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

    # Extract only content strictly inside ["Scans"] = { ... } using exact bracket matching
    scans_text = ""
    scans_pos = content.find('["Scans"]')
    if scans_pos != -1:
        brace_start = content.find('{', scans_pos)
        if brace_start != -1:
            depth = 1
            idx = brace_start + 1
            while idx < len(content) and depth > 0:
                if content[idx] == '{':
                    depth += 1
                elif content[idx] == '}':
                    depth -= 1
                idx += 1
            scans_text = content[brace_start+1:idx-1]

    item_blocks = list(re.finditer(r'\{([^}]+)\}', scans_text)) if scans_text.strip() else []
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

    raw_scans = []

    for m in item_blocks:
        snippet = m.group(1)

        uid_m = re.search(r'\["UID"\]\s*=\s*"([^"]+)"', snippet)
        link_m = re.search(r'\|H\d+:item:(\d+):', snippet)
        item_id_m = re.search(r'\["ItemId"\]\s*=\s*(\d+)', snippet)
        price_m = re.search(r'\["Price"\]\s*=\s*(\d+)', snippet)
        qty_m = re.search(r'\["Qty"\]\s*=\s*(\d+)', snippet)
        guild_m = re.search(r'\["Guild"\]\s*=\s*"([^"]+)"', snippet)
        loc_m = re.search(r'\["Location"\]\s*=\s*"([^"]+)"', snippet)
        seller_m = re.search(r'\["Seller"\]\s*=\s*"([^"]+)"', snippet)
        scanner_m = re.search(r'\["Scanner"\]\s*=\s*"([^"]+)"', snippet)
        time_m = re.search(r'\["Time"\]\s*=\s*(\d+)', snippet)
        scan_time = int(time_m.group(1)) if time_m else 0

        # Skip legacy scans older than 60 minutes (3,600 seconds)
        if scan_time > 0 and (now - scan_time) > 3600:
            continue

        if not player_name and scanner_m:
            player_name = scanner_m.group(1).strip()

        level_m = re.search(r'\["Level"\]\s*=\s*(\d+)', snippet)
        qual_m = re.search(r'\["Quality"\]\s*=\s*(\d+)', snippet)
        trait_m = re.search(r'\["Trait"\]\s*=\s*(\d+)', snippet)

        raw_link_id = int(link_m.group(1)) if link_m else 0
        raw_table_id = int(item_id_m.group(1)) if item_id_m else 0
        
        item_id = raw_link_id if raw_link_id in valid_ids else (raw_table_id if raw_table_id in valid_ids else 0)
        total_price = int(price_m.group(1)) if price_m else None
        qty = int(qty_m.group(1)) if qty_m else 1
        guild = guild_m.group(1).strip() if guild_m else "Local Guild Trader"
        location = loc_m.group(1).strip() if loc_m else "Tamriel Trader Kiosk"
        seller = seller_m.group(1).strip() if seller_m else "@Unknown"
        level = int(level_m.group(1)) if level_m else 1
        quality = int(qual_m.group(1)) if qual_m else 1
        trait_id = int(trait_m.group(1)) if trait_m else 0
        raw_uid = uid_m.group(1).strip() if uid_m else ""

        if item_id > 0 and total_price and total_price > 0:
            unit_price = max(1, int(round(total_price / qty)))
            raw_scans.append({
                "uid": raw_uid,
                "game_item_id": item_id,
                "price": unit_price,
                "quantity": qty,
                "seller_name": seller,
                "guild_name": guild,
                "location": location,
                "level": level,
                "quality": quality,
                "trait_id": trait_id,
                "scan_time": scan_time,
                "expires_at": exp_time
            })

    # Step 2: Determine latest scan batch timestamp per guild trader
    guild_latest_batch = {}
    for item in raw_scans:
        g_name = item["guild_name"]
        s_time = item["scan_time"]
        if g_name not in guild_latest_batch or s_time > guild_latest_batch[g_name]:
            guild_latest_batch[g_name] = s_time

    # Step 3: Filter records to keep all pages within the 60-second Session Cluster Window per guild trader
    session_cluster_items = []
    for item in raw_scans:
        g_name = item["guild_name"]
        max_time = guild_latest_batch[g_name]
        # Allow a 60-second session window to capture all multi-page callbacks (Pages 1-4)
        if max_time == 0 or (max_time - item["scan_time"]) <= 60:
            session_cluster_items.append(item)

    # Step 4: UID Set Deduplication & Grouping within the Session Cluster Window
    seen_uids_in_session = set()
    unique_items_in_session = []

    for item in session_cluster_items:
        uid = item["uid"]
        if uid and uid != "":
            if uid in seen_uids_in_session:
                continue # Skip duplicate re-searched UID within the session cluster
            seen_uids_in_session.add(uid)
        unique_items_in_session.append(item)

    # Step 5: Group unique items by seller listing key to compute active_stacks
    grouped_listings = {}
    for item in unique_items_in_session:
        group_key = (
            item["game_item_id"],
            server,
            item["guild_name"],
            item["seller_name"],
            item["price"],
            item["quantity"],
            item["level"],
            item["quality"],
            item["trait_id"]
        )

        if group_key in grouped_listings:
            grouped_listings[group_key]["active_stacks"] += 1
        else:
            grouped_listings[group_key] = {
                "game_item_id": item["game_item_id"],
                "price": item["price"],
                "quantity": item["quantity"],
                "active_stacks": 1,
                "seller_name": item["seller_name"],
                "guild_name": item["guild_name"],
                "location": item["location"],
                "level": item["level"],
                "quality": item["quality"],
                "trait_id": item["trait_id"],
                "expires_at": item["expires_at"]
            }

    listings = list(grouped_listings.values())

    affected_ids = set()
    if listings:
        print(f"Direct Ingesting {len(listings)} custom ESOTrade listings into database...")
        for item in listings:
            cursor.execute("""
                INSERT INTO guild_trader_listings 
                (game_item_id, server, seller_name, price, quantity, active_stacks, guild_name, location, level, quality, trait_id, expires_at, discovered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(game_item_id, server, guild_name, seller_name, price, quantity, level, quality, trait_id) DO UPDATE SET
                    active_stacks = excluded.active_stacks,
                    discovered_at = CURRENT_TIMESTAMP,
                    location = CASE WHEN excluded.location != 'Tamriel Trader Kiosk' AND excluded.location != 'Guild Trader' THEN excluded.location ELSE location END,
                    expires_at = COALESCE(excluded.expires_at, expires_at);
            """, (item["game_item_id"], server, item.get("seller_name", "@Unknown"), item["price"], item["quantity"], item.get("active_stacks", 1), item["guild_name"], item["location"], item["level"], item["quality"], item["trait_id"], item["expires_at"]))
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

        # Sync character equipped gear loadout to character_gear table
        cursor.execute("SELECT id FROM characters WHERE name = ?", (player_name,))
        char_row = cursor.fetchone()
        if char_row:
            char_id = char_row[0]
            gear_pos = content.find('["Gear"]')
            if gear_pos != -1:
                gear_section = content[gear_pos:]
                # Match every individual gear item block containing ["Slot"] = X
                gear_item_blocks = list(re.finditer(r'\{[^{}]*?\["Slot"\]\s*=\s*\d+[^{}]*?\}', gear_section, re.DOTALL))
                synced_gear_count = 0
                for gm in gear_item_blocks:
                    gsnippet = gm.group(0)
                    g_slot = re.search(r'\["Slot"\]\s*=\s*(\d+)', gsnippet)
                    g_item_id = re.search(r'\["ItemId"\]\s*=\s*(\d+)', gsnippet)
                    g_name = re.search(r'\["Name"\]\s*=\s*"([^"]+)"', gsnippet)
                    g_link = re.search(r'\["Link"\]\s*=\s*"([^"]+)"', gsnippet)
                    g_qual = re.search(r'\["Quality"\]\s*=\s*(\d+)', gsnippet)
                    g_trait = re.search(r'\["TraitId"\]\s*=\s*(\d+)', gsnippet)
                    g_set = re.search(r'\["SetName"\]\s*=\s*"([^"]+)"', gsnippet)
                    g_icon = re.search(r'\["Icon"\]\s*=\s*"([^"]+)"', gsnippet)
                    g_enc = re.search(r'\["Enchant"\]\s*=\s*"([^"]+)"', gsnippet)
                    g_tname = re.search(r'\["TraitName"\]\s*=\s*"([^"]+)"', gsnippet)
                    g_tdesc = re.search(r'\["TraitDesc"\]\s*=\s*"([^"]+)"', gsnippet)
                    g_arm = re.search(r'\["Armor"\]\s*=\s*(\d+)', gsnippet)
                    g_pow = re.search(r'\["Power"\]\s*=\s*(\d+)', gsnippet)

                    if g_slot and g_name:
                        slot_id = int(g_slot.group(1))
                        item_name = g_name.group(1).strip()
                        item_link = g_link.group(1).strip() if g_link else ""
                        item_id = int(g_item_id.group(1)) if g_item_id else 0
                        quality = int(g_qual.group(1)) if g_qual else 1
                        trait_id = int(g_trait.group(1)) if g_trait else 0

                        # Extract true quality and trait directly from ESO item_link if available
                        if item_link and (quality <= 1 or trait_id <= 0):
                            lparts = item_link.split(':')
                            if len(lparts) >= 7:
                                if quality <= 1 and lparts[5].isdigit():
                                    parsed_q = int(lparts[5])
                                    if 1 <= parsed_q <= 5:
                                        quality = parsed_q
                                if trait_id <= 0 and lparts[6].isdigit():
                                    parsed_t = int(lparts[6])
                                    if parsed_t > 0:
                                        trait_id = parsed_t

                        set_name = g_set.group(1).strip() if g_set else ""
                        item_icon = g_icon.group(1).strip() if g_icon else ""
                        enchant_text = g_enc.group(1).strip() if g_enc else ""
                        trait_name = g_tname.group(1).strip() if g_tname else ""
                        trait_desc = g_tdesc.group(1).strip() if g_tdesc else ""
                        armor_rating = int(g_arm.group(1)) if g_arm else 0
                        weapon_power = int(g_pow.group(1)) if g_pow else 0

                        cursor.execute("""
                            INSERT INTO character_gear (character_id, slot_id, game_item_id, item_name, item_link, quality, trait_id, set_name, enchantment_description, item_icon, trait_name, trait_description, armor_rating, weapon_power, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                            ON CONFLICT(character_id, slot_id) DO UPDATE SET
                                game_item_id = excluded.game_item_id,
                                item_name = excluded.item_name,
                                item_link = excluded.item_link,
                                quality = excluded.quality,
                                trait_id = excluded.trait_id,
                                set_name = excluded.set_name,
                                enchantment_description = excluded.enchantment_description,
                                item_icon = excluded.item_icon,
                                trait_name = excluded.trait_name,
                                trait_description = excluded.trait_description,
                                armor_rating = excluded.armor_rating,
                                weapon_power = excluded.weapon_power,
                                updated_at = CURRENT_TIMESTAMP;
                        """, (char_id, slot_id, item_id, item_name, item_link, quality, trait_id, set_name, enchant_text, item_icon, trait_name, trait_desc, armor_rating, weapon_power))
                        synced_gear_count += 1
                if synced_gear_count > 0:
                    print(f"Synced {synced_gear_count} equipped gear items to character '{player_name}' loadout!")

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

        # Parse Gear loadout if exported by ESOTrade.lua (for API push)
        gear_items = []
        gear_pos2 = content.find('["Gear"]')
        if gear_pos2 != -1:
            g_brace_start = content.find('{', gear_pos2)
            if g_brace_start != -1:
                depth = 1
                g_idx = g_brace_start + 1
                while g_idx < len(content) and depth > 0:
                    if content[g_idx] == '{': depth += 1
                    elif content[g_idx] == '}': depth -= 1
                    g_idx += 1
                gear_text = content[g_brace_start+1:g_idx-1]
                
                slot_blocks = re.finditer(r'\{[^{}]*?\["Slot"\]\s*=\s*\d+[^{}]*?\}', gear_text, re.DOTALL)
                for sb in slot_blocks:
                    sb_text = sb.group(0)
                    slot_m = re.search(r'\["Slot"\]\s*=\s*(\d+)', sb_text)
                    link_m = re.search(r'\["Link"\]\s*=\s*"([^"]+)"', sb_text)
                    name_m = re.search(r'\["Name"\]\s*=\s*"([^"]+)"', sb_text)
                    id_m = re.search(r'\["ItemId"\]\s*=\s*(\d+)', sb_text)
                    qual_m = re.search(r'\["Quality"\]\s*=\s*(\d+)', sb_text)
                    trait_m = re.search(r'\["TraitId"\]\s*=\s*(\d+)', sb_text)
                    set_m = re.search(r'\["SetName"\]\s*=\s*"([^"]+)"', sb_text)
                    icon_m = re.search(r'\["Icon"\]\s*=\s*"([^"]+)"', sb_text)
                    enc_m = re.search(r'\["Enchant"\]\s*=\s*"([^"]+)"', sb_text)
                    tname_m = re.search(r'\["TraitName"\]\s*=\s*"([^"]+)"', sb_text)
                    tdesc_m = re.search(r'\["TraitDesc"\]\s*=\s*"([^"]+)"', sb_text)
                    arm_m = re.search(r'\["Armor"\]\s*=\s*(\d+)', sb_text)
                    pow_m = re.search(r'\["Power"\]\s*=\s*(\d+)', sb_text)

                    if (name_m or link_m) and slot_m:
                        item_link_str = link_m.group(1) if link_m else ""
                        parsed_q = int(qual_m.group(1)) if qual_m else 1
                        parsed_t = int(trait_m.group(1)) if trait_m else 0

                        if item_link_str and (parsed_q <= 1 or parsed_t <= 0):
                            lparts = item_link_str.split(':')
                            if len(lparts) >= 7:
                                if parsed_q <= 1 and lparts[5].isdigit():
                                    q_val = int(lparts[5])
                                    if 1 <= q_val <= 5:
                                        parsed_q = q_val
                                if parsed_t <= 0 and lparts[6].isdigit():
                                    t_val = int(lparts[6])
                                    if t_val > 0:
                                        parsed_t = t_val

                        gear_items.append({
                            "slot_id": int(slot_m.group(1)),
                            "game_item_id": int(id_m.group(1)) if id_m else 0,
                            "item_name": name_m.group(1) if name_m else "Equipped Item",
                            "item_link": item_link_str,
                            "quality": parsed_q,
                            "trait_id": parsed_t,
                            "set_name": set_m.group(1) if set_m else None,
                            "enchantment_description": enc_m.group(1) if enc_m else None,
                            "item_icon": icon_m.group(1) if icon_m else None,
                            "trait_name": tname_m.group(1) if tname_m else None,
                            "trait_description": tdesc_m.group(1) if tdesc_m else None,
                            "armor_rating": int(arm_m.group(1)) if arm_m else 0,
                            "weapon_power": int(pow_m.group(1)) if pow_m else 0
                        })

        if gear_items and player_name:
            try:
                gear_payload = {
                    "character_name": player_name,
                    "gear": gear_items
                }
                g_req = urllib.request.Request(
                    f"{server_url}/api/characters/upload-gear",
                    data=json.dumps(gear_payload).encode('utf-8'),
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": "Bearer dev-token-blake-123"
                    }
                )
                with urllib.request.urlopen(g_req, timeout=10) as g_res:
                    g_data = json.loads(g_res.read().decode('utf-8'))
                    print(f"  [API Gear Sync] Synced {len(gear_items)} equipped gear slots for {player_name}!")
            except Exception as ge:
                print("  [Notice] API Gear Push skipped:", ge)

        print(f"SUCCESS! Ingested {len(listings)} custom ESOTrade listings into database!")

        # Automated SavedVariables Disk Flush: Reset Scans = {} in ESOTrade.lua SavedVariables on disk
        try:
            # Cleanly strip all scanned items from ["Scans"] = { ... }
            new_content = re.sub(r'\["Scans"\]\s*=\s*\{[^\}]*\}', '["Scans"] = {}', content, flags=re.DOTALL)
            # Also strip any orphaned numerical array items left outside
            new_content = re.sub(r'\n\s*\[\d+\]\s*=\s*\{[^\}]*\},?', '', new_content, flags=re.DOTALL)
            if new_content != content:
                with open(sv_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"AUTOMATED FLUSH: Reset scanned items in {os.path.basename(sv_file)} on disk!")
        except Exception as fe:
            print("[Notice] SavedVariables disk flush notice:", fe)

    conn.close()
    return len(listings)

if __name__ == "__main__":
    parse_and_sync_esotrade()
