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

ESO_TRAIT_NAMES = {
    0: "None",
    # Weapon Traits (1-10)
    1: "Powered",
    2: "Charged",
    3: "Precise",
    4: "Infused",
    5: "Defending",
    6: "Training",
    7: "Sharpened",
    8: "Decisive",
    9: "Intricate",
    10: "Ornate",
    # Armor Traits (11-20)
    11: "Sturdy",
    12: "Impenetrable",
    13: "Reinforced",
    14: "Well-Fitted",
    15: "Training",
    16: "Infused",
    17: "Invigorating",
    18: "Divines",
    19: "Intricate",
    20: "Ornate",
    # Jewelry Traits (21-24, 27, 30-35)
    21: "Healthy",
    22: "Arcane",
    23: "Robust",
    24: "Intricate",
    25: "Nirnhoned",
    26: "Nirnhoned",
    27: "Ornate",
    28: "Protective",
    29: "Swift",
    30: "Triune",
    31: "Bloodthirsty",
    32: "Harmony",
    33: "Swift",
    34: "Protective",
    35: "Infused",
}

DEFAULT_TRAIT_DESCRIPTIONS = {
    # Weapon Traits
    1: "Increases healing done by up to 9%.",
    2: "Increases chance to apply status effects by up to 480%.",
    3: "Increases Weapon and Spell Critical by up to 7.7%.",
    4: "Increases weapon enchantment effect by up to 30% and reduces enchantment cooldown by up to 50%.",
    5: "Increases total Armor by up to 3276.",
    6: "Increases experience gained from kills by up to 9%.",
    7: "Increases Armor Penetration by up to 3276.",
    8: "Chance to gain 1 additional Ultimate when gaining Ultimate by up to 60%.",
    9: "Increases Inspiration gained from deconstruction by up to 300%.",
    10: "Increases sell price to merchants by 280%.",
    # Armor Traits
    11: "Reduces Block cost by up to 4%.",
    12: "Increases Critical Resistance by up to 127.",
    13: "Increases this item's Armor value by up to 16%.",
    14: "Reduces Sprint, Roll Dodge, and Sneak cost by up to 5%.",
    15: "Increases experience gained from kills by up to 11%.",
    16: "Increases Armor Enchantment effect by up to 20%.",
    17: "Increases Health, Magicka, and Stamina Recovery by up to 16.",
    18: "Increases Mundus Stone effects by up to 9.1%.",
    19: "Increases Inspiration gained from deconstruction by up to 300%.",
    20: "Increases sell price to merchants by 280%.",
    # Jewelry & Nirnhoned
    21: "Increases Maximum Health by up to 957.",
    22: "Increases Maximum Magicka by up to 870.",
    23: "Increases Maximum Stamina by up to 870.",
    24: "Increases Inspiration gained from deconstruction by up to 300%.",
    25: "Increases Spell and Physical Resistance by up to 301.",
    26: "Increases Weapon and Spell Damage by up to 15%.",
    27: "Increases sell price to merchants by 280%.",
    28: "Increases Spell and Physical Resistance by up to 1190.",
    29: "Increases your Movement Speed by up to 7%.",
    30: "Increases Maximum Health by up to 478, Maximum Magicka by up to 435, and Maximum Stamina by up to 435.",
    31: "Increases your Damage done against enemies under 25% Health by up to 350.",
    32: "Increases the damage, healing, resource restore, and damage shield strength of synergies you activate by up to 880.",
    33: "Increases your Movement Speed by up to 7%.",
    34: "Increases Spell and Physical Resistance by up to 1190.",
    35: "Increases Jewelry Enchantment effectiveness by up to 60%.",
}

SAVED_VARS_PATHS = [
    os.path.expanduser("~/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
    os.path.expanduser("~/OneDrive/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua"),
]

def find_esotrade_savedvars():
    for p in SAVED_VARS_PATHS:
        if os.path.exists(p):
            return p
    return None

def reset_esotrade_scans_on_disk(file_path):
    """
    Safely and cleanly resets ["Scans"] = {} inside ESOTrade.lua on disk
    without corrupting character metadata or equipped gear loadouts.
    """
    if not file_path or not os.path.exists(file_path):
        return False
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        scans_pos = content.find('["Scans"]')
        if scans_pos == -1:
            return False

        brace_start = content.find('{', scans_pos)
        if brace_start == -1:
            return False

        depth = 1
        idx = brace_start + 1
        while idx < len(content) and depth > 0:
            if content[idx] == '{':
                depth += 1
            elif content[idx] == '}':
                depth -= 1
            idx += 1

        if depth == 0:
            new_content = content[:brace_start] + "{}" + content[idx:]
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"[ESOTrade Auto-Clear] Emptied Scans table in {os.path.basename(file_path)} on disk (ready for fresh scans).")
            return True
    except Exception as e:
        print(f"[ESOTrade Auto-Clear Warning] Could not reset Scans in {os.path.basename(file_path)}: {e}")
    return False

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
        name_m = re.search(r'\["Name"\]\s*=\s*"([^"]+)"', snippet)
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
        trait_m = re.search(r'\["Trait"\]\s*=\s*(\d+)', snippet) or re.search(r'\["TraitId"\]\s*=\s*(\d+)', snippet)

        raw_link_id = int(link_m.group(1)) if link_m else 0
        raw_table_id = int(item_id_m.group(1)) if item_id_m else 0
        raw_name = name_m.group(1).strip() if name_m else ""
        
        item_id = raw_link_id if raw_link_id in valid_ids else (raw_table_id if raw_table_id in valid_ids else 0)
        total_price = int(price_m.group(1)) if price_m else None
        qty = int(qty_m.group(1)) if qty_m else 1
        guild = guild_m.group(1).strip() if guild_m else "Local Guild Trader"
        location = loc_m.group(1).strip() if loc_m else "Tamriel Trader Kiosk"
        seller = seller_m.group(1).strip() if seller_m else "@Unknown"
        level = int(level_m.group(1)) if level_m else 1
        quality = int(qual_m.group(1)) if qual_m else 1
        trait_id = int(trait_m.group(1)) if trait_m else 0

        # If trait_id is 0, attempt parsing from full item link
        if trait_id <= 0:
            link_full_m = re.search(r'\|H\d+:item:[^|]+\|h', snippet)
            if link_full_m:
                lparts = link_full_m.group(0).split(':')
                if len(lparts) >= 7 and lparts[6].isdigit():
                    trait_id = int(lparts[6])

        raw_uid = uid_m.group(1).strip() if uid_m else ""

        if item_id > 0 and total_price and total_price > 0:
            unit_price = max(1, int(round(total_price / qty)))
            raw_scans.append({
                "uid": raw_uid,
                "game_item_id": item_id,
                "item_name": raw_name,
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
            if not grouped_listings[group_key].get("item_name") and item.get("item_name"):
                grouped_listings[group_key]["item_name"] = item["item_name"]
        else:
            grouped_listings[group_key] = {
                "game_item_id": item["game_item_id"],
                "item_name": item.get("item_name", ""),
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

    # Purge any expired listings prior to ingesting fresh scans
    cursor.execute("DELETE FROM guild_trader_listings WHERE expires_at IS NOT NULL AND datetime(expires_at) < datetime('now');")

    affected_ids = set()
    if listings:
        print(f"Direct Ingesting {len(listings)} custom ESOTrade listings into database...")
        for item in listings:
            cursor.execute("""
                INSERT INTO guild_trader_listings 
                (game_item_id, item_name, server, seller_name, price, quantity, active_stacks, guild_name, location, level, quality, trait_id, expires_at, discovered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(game_item_id, server, guild_name, seller_name, price, quantity, level, quality, trait_id) DO UPDATE SET
                    item_name = COALESCE(excluded.item_name, item_name),
                    active_stacks = excluded.active_stacks,
                    discovered_at = CURRENT_TIMESTAMP,
                    location = CASE WHEN excluded.location != 'Tamriel Trader Kiosk' AND excluded.location != 'Guild Trader' THEN excluded.location ELSE location END,
                    expires_at = COALESCE(excluded.expires_at, expires_at);
            """, (item["game_item_id"], item.get("item_name"), server, item.get("seller_name", "@Unknown"), item["price"], item["quantity"], item.get("active_stacks", 1), item["guild_name"], item["location"], item["level"], item["quality"], item["trait_id"], item["expires_at"]))
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
                        if item_icon:
                            item_icon = item_icon.replace(".dds", ".png").replace(".DDS", ".png")
                            if item_icon.startswith("/esoui/") or item_icon.startswith("esoui/"):
                                item_icon = f"https://esoicons.uesp.net/{item_icon.lstrip('/')}"

                        enchant_text = g_enc.group(1).strip() if g_enc else ""
                        trait_name = g_tname.group(1).strip() if g_tname else ""
                        trait_desc = g_tdesc.group(1).strip() if g_tdesc else ""
                        if not trait_name and trait_id in ESO_TRAIT_NAMES:
                            trait_name = ESO_TRAIT_NAMES[trait_id]
                        if not trait_desc and trait_id in DEFAULT_TRAIT_DESCRIPTIONS:
                            trait_desc = DEFAULT_TRAIT_DESCRIPTIONS[trait_id]

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

            # Sync character trait research if present
            trait_items = []
            traits_pos = content.find('["TraitResearch"]')
            if traits_pos != -1:
                t_brace_start = content.find('{', traits_pos)
                if t_brace_start != -1:
                    depth = 1
                    t_idx = t_brace_start + 1
                    while t_idx < len(content) and depth > 0:
                        if content[t_idx] == '{': depth += 1
                        elif content[t_idx] == '}': depth -= 1
                        t_idx += 1
                    traits_text = content[t_brace_start+1:t_idx-1]

                    # Use order-independent field extraction per block
                    # ESO Lua serializer does NOT guarantee field order, so we
                    # match each {...} block and extract fields individually.
                    inner_blocks = list(re.finditer(r'\{([^{}]+)\}', traits_text))
                    synced_traits_count = 0
                    for block in inner_blocks:
                        t_block_text = block.group(0)

                        eq_m = re.search(r'\["EquipmentType"\]\s*=\s*"([^"]+)"', t_block_text)
                        tid_m = re.search(r'\["TraitId"\]\s*=\s*(\d+)', t_block_text)
                        st_m = re.search(r'\["Status"\]\s*=\s*"([^"]+)"', t_block_text)
                        craft_m = re.search(r'\["CraftingType"\]\s*=\s*"([^"]+)"', t_block_text)
                        tname_m = re.search(r'\["TraitName"\]\s*=\s*"([^"]*)"', t_block_text)
                        start_m = re.search(r'\["StartedAt"\]\s*=\s*(\d+)', t_block_text)
                        comp_m = re.search(r'\["CompletesAt"\]\s*=\s*(\d+)', t_block_text)

                        if not eq_m or not tid_m or not st_m:
                            continue

                        eq_type = eq_m.group(1).strip()
                        tr_id = int(tid_m.group(1))
                        tr_status = st_m.group(1).strip().upper()

                        started_at = None
                        completes_at = None
                        if start_m:
                            try: started_at = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(int(start_m.group(1))))
                            except Exception: pass
                        if comp_m:
                            try: completes_at = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(int(comp_m.group(1))))
                            except Exception: pass

                        if tr_status in ("COMPLETED", "RESEARCHING", "UNKNOWN"):
                            if craft_m:
                                crafting_type = craft_m.group(1).strip()
                            else:
                                crafting_type = "Blacksmithing" if eq_type in ("Axe", "Mace", "Sword", "Battleaxe", "Greatsword", "Maul", "Dagger", "Cuirass", "Sabatons", "Gauntlets", "Helm", "Greaves", "Pauldrons", "Girdle") else ("Clothier" if eq_type in ("Robe", "Shoes", "Gloves", "Hat", "Breeches", "Epaulets", "Sash", "Jack", "Boots", "Bracers", "Helmet", "Guards", "Arm Cops", "Belt") else ("Woodworking" if eq_type in ("Bow", "Inferno Staff", "Ice Staff", "Lightning Staff", "Restoration Staff", "Shield") else "Jewelry"))
                            
                            tr_name = tname_m.group(1).strip() if tname_m else ESO_TRAIT_NAMES.get(tr_id, "Unknown")
                            cursor.execute("""
                                INSERT INTO character_trait_research (character_id, crafting_type, equipment_type, trait_id, trait_name, research_status, started_at, completes_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                                ON CONFLICT(character_id, equipment_type, trait_id) DO UPDATE SET
                                    research_status = excluded.research_status,
                                    started_at = excluded.started_at,
                                    completes_at = excluded.completes_at,
                                    updated_at = CURRENT_TIMESTAMP;
                            """, (char_id, crafting_type, eq_type, tr_id, tr_name, tr_status, started_at, completes_at))
                            synced_traits_count += 1

                            trait_items.append({
                                "crafting_type": crafting_type,
                                "equipment_type": eq_type,
                                "trait_id": tr_id,
                                "trait_name": tr_name,
                                "research_status": tr_status,
                                "started_at": started_at,
                                "completes_at": completes_at
                            })
                    if synced_traits_count > 0:
                        print(f"Synced {synced_traits_count} trait research records for '{player_name}'!")

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
                auth_token = os.environ.get("ESOTRADE_AUTH_TOKEN")
                headers = {"Content-Type": "application/json"}
                if auth_token:
                    headers["Authorization"] = f"Bearer {auth_token}"
                req = urllib.request.Request(
                    f"{server_url}/api/market/upload-scans",
                    data=json.dumps(payload).encode('utf-8'),
                    headers=headers
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

                        g_tname_str = tname_m.group(1).strip() if tname_m else ""
                        g_tdesc_str = tdesc_m.group(1).strip() if tdesc_m else ""
                        if not g_tname_str and parsed_t in ESO_TRAIT_NAMES:
                            g_tname_str = ESO_TRAIT_NAMES[parsed_t]
                        if not g_tdesc_str and parsed_t in DEFAULT_TRAIT_DESCRIPTIONS:
                            g_tdesc_str = DEFAULT_TRAIT_DESCRIPTIONS[parsed_t]

                        parsed_icon = icon_m.group(1).strip() if icon_m else None
                        if parsed_icon:
                            parsed_icon = parsed_icon.replace(".dds", ".png").replace(".DDS", ".png")
                            if parsed_icon.startswith("/esoui/") or parsed_icon.startswith("esoui/"):
                                parsed_icon = f"https://esoicons.uesp.net/{parsed_icon.lstrip('/')}"

                        gear_items.append({
                            "slot_id": int(slot_m.group(1)),
                            "game_item_id": int(id_m.group(1)) if id_m else 0,
                            "item_name": name_m.group(1) if name_m else "Equipped Item",
                            "item_link": item_link_str,
                            "quality": parsed_q,
                            "trait_id": parsed_t,
                            "set_name": set_m.group(1) if set_m else None,
                            "enchantment_description": enc_m.group(1) if enc_m else None,
                            "item_icon": parsed_icon,
                            "trait_name": g_tname_str or None,
                            "trait_description": g_tdesc_str or None,
                            "armor_rating": int(arm_m.group(1)) if arm_m else 0,
                            "weapon_power": int(pow_m.group(1)) if pow_m else 0
                        })

        if gear_items and player_name:
            try:
                gear_payload = {
                    "character_name": player_name,
                    "gear": gear_items
                }
                auth_token = os.environ.get("ESOTRADE_AUTH_TOKEN")
                headers = {"Content-Type": "application/json"}
                if auth_token:
                    headers["Authorization"] = f"Bearer {auth_token}"
                g_req = urllib.request.Request(
                    f"{server_url}/api/characters/upload-gear",
                    data=json.dumps(gear_payload).encode('utf-8'),
                    headers=headers
                )
                with urllib.request.urlopen(g_req, timeout=10) as g_res:
                    g_data = json.loads(g_res.read().decode('utf-8'))
                    print(f"  [API Gear Sync] Synced {len(gear_items)} equipped gear slots for {player_name}!")
            except Exception as ge:
                print("  [Notice] API Gear Push skipped:", ge)

        if trait_items and player_name:
            try:
                traits_payload = {
                    "character_name": player_name,
                    "traits": trait_items
                }
                auth_token = os.environ.get("ESOTRADE_AUTH_TOKEN")
                headers = {"Content-Type": "application/json"}
                if auth_token:
                    headers["Authorization"] = f"Bearer {auth_token}"
                t_req = urllib.request.Request(
                    f"{server_url}/api/characters/upload-traits",
                    data=json.dumps(traits_payload).encode('utf-8'),
                    headers=headers
                )
                with urllib.request.urlopen(t_req, timeout=10) as t_res:
                    t_data = json.loads(t_res.read().decode('utf-8'))
                    print(f"  [API Trait Sync] Synced {len(trait_items)} trait nodes for {player_name}!")
            except Exception as te:
                print("  [Notice] API Trait Push skipped:", te)

        print(f"SUCCESS! Ingested {len(listings)} custom ESOTrade listings into database!")

        # Automated SavedVariables Disk Flush: Cleanly reset Scans = {} in ESOTrade.lua on disk
        reset_esotrade_scans_on_disk(sv_file)

    conn.close()
    return len(listings)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Parse and sync ESOTrade SavedVariables")
    parser.add_argument("--file", help="Path to ESOTrade.lua SavedVariables file")
    parser.add_argument("--server-url", default="http://localhost:5001", help="API server URL")
    args = parser.parse_args()
    parse_and_sync_esotrade(file_path=args.file, server_url=args.server_url)
