import requests
import json
import os
import sys
import time
import argparse

# Configuration
UESP_EXPORT_URL = "https://esoitem.uesp.net/exportJson.php"
DEFAULT_OUTPUT_FILE = "exports/items.json"

def get_item_type(type_id):
    mapping = {
        1: "Weapon",
        2: "Armor",
        3: "Plug",
        4: "Food",
        5: "Trophy",
        6: "Keep Repair",
        7: "Potion",
        8: "Motif",
        9: "Potion Base",
        10: "Ingredient",
        11: "Addon",
        12: "Drink",
        13: "Costume",
        14: "Costume Piece",
        15: "Lure",
        16: "Raw Material",
        17: "Material",
        18: "Trait Item",
        19: "Repair Kit",
        20: "Lockpick",
        21: "Soul Gem",
        22: "Weapon Booster",
        23: "Armor Booster",
        24: "Enchantment Booster",
        25: "Enchanting Rune",
        26: "Glyph Weapon",
        27: "Glyph Armor",
        28: "Glyph Jewelry",
        29: "Furnishing",
        30: "Recipe",
        31: "Poison",
        32: "Poison Base",
        33: "Mount",
        34: "Tool",
        61: "Furnishing Material"
    }
    return mapping.get(type_id, "Unknown")

def get_category_subcategory(raw_type, raw_equip, raw_weapon, raw_armor, raw_craft):
    category = "Other"
    subcategory = "Unknown"

    if raw_type == 1:
        category = "Weapon"
        w_map = {1:"Axe", 2:"Mace", 3:"Sword", 4:"Two Handed Sword", 5:"Two Handed Axe", 6:"Two Handed Mace", 8:"Bow", 9:"Destruction Staff", 11:"Dagger", 12:"Restoration Staff"}
        subcategory = w_map.get(raw_weapon, "Weapon")
    elif raw_type == 2:
        category = "Armor"
        if raw_armor == 1: subcategory = "Light Armor"
        elif raw_armor == 2: subcategory = "Medium Armor"
        elif raw_armor == 3: subcategory = "Heavy Armor"
    elif raw_type in [4, 7, 12, 31]:
        category = "Consumable"
        if raw_type == 4: subcategory = "Food"
        elif raw_type == 12: subcategory = "Drink"
        elif raw_type == 7: subcategory = "Potion"
        elif raw_type == 31: subcategory = "Poison"
    elif raw_type == 29:
        category = "Furnishing"
    elif raw_type == 30:
        category = "Recipe"
        if raw_craft == 1: subcategory = "Blacksmithing"
        elif raw_craft == 2: subcategory = "Clothier"
        elif raw_craft == 3: subcategory = "Enchanting"
        elif raw_craft == 4: subcategory = "Alchemy"
        elif raw_craft == 5: subcategory = "Provisioning"
        elif raw_craft == 6: subcategory = "Woodworking"
        elif raw_craft == 7: subcategory = "Jewelry Crafting"

    return category, subcategory

def parse_quality(quality_str):
    if not quality_str:
        return 1, None
    quality_str = str(quality_str)
    if "-" in quality_str:
        parts = quality_str.split("-")
        try:
            return int(parts[-1]), quality_str
        except ValueError:
            return 1, quality_str
    try:
        return int(quality_str), None
    except ValueError:
        return 1, None

def get_int(row, key, default=-1):
    val = row.get(key)
    if val is None:
        return default
    if isinstance(val, int):
        return val
    if isinstance(val, float):
        return int(val)
    val_str = str(val).strip()
    if not val_str:
        return default
    try:
        return int(val_str)
    except ValueError:
        return default

def normalize_item(row):
    try:
        item_id = get_int(row, "itemId", 0)
    except ValueError:
        return None

    if item_id == 0:
        return None

    name = row.get("name", "")
    if "^" in name:
        name = name.split("^")[0]

    raw_type = get_int(row, "type", -1)
    raw_equip = get_int(row, "equipType", -1)
    raw_weapon = get_int(row, "weaponType", -1)
    raw_armor = get_int(row, "armorType", -1)
    raw_craft = get_int(row, "craftType", -1)
    raw_bind = get_int(row, "bindType", -1)
    raw_vendor_trash = get_int(row, "isVendorTrash", 0)

    quality_str = row.get("quality", "1")
    rarity, quality_range = parse_quality(quality_str)

    item_type = get_item_type(raw_type)
    category, subcategory = get_category_subcategory(raw_type, raw_equip, raw_weapon, raw_armor, raw_craft)

    icon = row.get("icon", "")
    if icon.startswith('/'):
        icon = f"https://esoicons.uesp.net{icon}"

    metadata = {}

    if quality_range:
        metadata["quality_range"] = quality_range

    # Trait
    trait_desc = row.get("traitDesc")
    trait_id = get_int(row, "trait", -1)
    if trait_desc or trait_id > 0:
        if trait_id > 0:
            metadata["trait_id"] = trait_id
        if trait_desc:
            metadata["trait_description"] = trait_desc

    if row.get("traitAbilityDesc"):
        metadata["trait_ability"] = row.get("traitAbilityDesc")

    # Style
    style_id = get_int(row, "style", -1)
    if style_id > 0:
        metadata["style_id"] = style_id

    # Set
    if row.get("setName"):
        set_data = {"name": row.get("setName"), "bonuses": []}
        set_id = get_int(row, "setId", -1)
        if set_id > 0:
            set_data["id"] = set_id

        for i in range(1, 13):  # UESP supports up to 12 bonuses
            bonus = row.get(f"setBonusDesc{i}")
            if bonus:
                set_data["bonuses"].append(bonus)
        metadata["set"] = set_data

    # Crafting
    crafting = {}
    if row.get("materialLevelDesc"): crafting["material_desc"] = row.get("materialLevelDesc")
    if row.get("resultItemLink"): crafting["result_item"] = row.get("resultItemLink")
    if row.get("recipeIndex"): crafting["recipe_index"] = row.get("recipeIndex")
    if crafting:
        metadata["crafting"] = crafting

    # Furnishing
    if raw_type in [29, 61]:
        metadata["furnishing"] = {"is_furnishing": True}

    # Stats
    stats = {}
    if row.get("armorRating") and str(row.get("armorRating")) != "0": stats["armor_rating"] = str(row.get("armorRating"))
    if row.get("weaponPower") and str(row.get("weaponPower")) != "0": stats["weapon_power"] = str(row.get("weaponPower"))
    if stats:
        metadata["stats"] = stats

    # Raw Data
    metadata["raw"] = {
        "type": raw_type,
        "weapon_type": raw_weapon,
        "armor_type": raw_armor,
        "craft_type": raw_craft,
        "equip_type": raw_equip,
        "bind_type": raw_bind,
        "is_vendor_trash": raw_vendor_trash
    }

    # Flags
    if row.get("isUnique"):
        is_unique = str(row.get("isUnique")).lower() in ['1', 'true', 'yes']
        if is_unique:
            metadata.setdefault("flags", {})["is_unique"] = is_unique

    return {
        "game_item_id": item_id,
        "name": name,
        "item_type": item_type,
        "category": category,
        "subcategory": str(subcategory),
        "rarity": rarity,
        "icon_url": icon,
        "metadata": metadata
    }

def fetch_chunk(start_id, end_id, max_retries=3):
    """
    Fetches a range of items from UESP exportJson API with retries and backoff.
    """
    params = {
        "table": "minedItemSummary",
        "startid": start_id,
        "endid": end_id
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    }

    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(UESP_EXPORT_URL, params=params, headers=headers, timeout=15)
            response.raise_for_status()
            data = response.json()
            return data.get("minedItemSummary", [])
        except (requests.exceptions.RequestException, json.JSONDecodeError) as e:
            print(f"   [Warning] Attempt {attempt} failed for range {start_id}-{end_id}: {e}")
            if attempt < max_retries:
                sleep_time = 2 ** attempt
                print(f"   Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                print(f"   [Error] All attempts failed for range {start_id}-{end_id}.")
                return None

def main():
    parser = argparse.ArgumentParser(description="Fetch and Ingest ESO Item Catalog from UESP JSON API")
    parser.add_argument("--start-id", type=int, default=3, help="Start Item ID (default: 3)")
    parser.add_argument("--end-id", type=int, default=280000, help="End Item ID (default: 280000)")
    parser.add_argument("--chunk-size", type=int, default=10000, help="IDs to query per API call (default: 10000)")
    parser.add_argument("--delay", type=float, default=0.2, help="Delay in seconds between API calls (default: 0.2)")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of output items (0 for no limit)")
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT_FILE, help=f"Path to output file (default: {DEFAULT_OUTPUT_FILE})")
    parser.add_argument("--test", action="store_true", help="Short-circuit execution for a quick verification test")
    
    args = parser.parse_args()

    # Short-circuit parameters for test mode
    if args.test:
        args.start_id = 120000
        args.end_id = 120050
        args.chunk_size = 50
        args.limit = 10
        print("[Test Mode Enabled] Querying item IDs 120000 to 120050...")

    print(f"Initializing catalog ingestion from {args.start_id} to {args.end_id}...")
    print(f"Querying in chunks of {args.chunk_size} with a {args.delay}s delay...")

    all_normalized_items = []
    current_start = args.start_id

    while current_start <= args.end_id:
        current_end = min(current_start + args.chunk_size - 1, args.end_id)
        print(f"Fetching range {current_start} to {current_end}...")
        
        raw_items = fetch_chunk(current_start, current_end)
        
        if raw_items:
            print(f"   Retrieved {len(raw_items)} raw items. Normalizing...")
            for raw_item in raw_items:
                normalized = normalize_item(raw_item)
                if normalized:
                    all_normalized_items.append(normalized)
                    
                if args.limit > 0 and len(all_normalized_items) >= args.limit:
                    print(f"Reached output limit of {args.limit} items.")
                    break
        else:
            print(f"   No items retrieved for range {current_start}-{current_end}.")

        if args.limit > 0 and len(all_normalized_items) >= args.limit:
            break

        current_start += args.chunk_size
        time.sleep(args.delay)

    # Save to file
    if all_normalized_items:
        os.makedirs(os.path.dirname(args.output), exist_ok=True)
        with open(args.output, "w", encoding='utf-8') as f:
            json.dump(all_normalized_items, f, indent=2, ensure_ascii=False)
        print(f"\nSuccessfully generated {len(all_normalized_items)} items in {args.output}")
    else:
        print("\nNo items were successfully fetched and normalized.")
        sys.exit(1)

if __name__ == "__main__":
    main()
