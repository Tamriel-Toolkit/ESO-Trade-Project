import requests
import json
import os
import time
import argparse
from collections import Counter
import hashlib
from pathlib import Path
import tempfile

from catalog_manifest import (
    FIRST_ID, LAST_ID, SOURCE_URL, MAX_BYTES, file_sha256, retrieval_id, utc_now,
    validate_item, validate_source,
)

# Configuration
UESP_EXPORT_URL = SOURCE_URL
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUTPUT_FILE = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "items.json"))

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

def get_category_subcategory(name, raw_type, raw_equip, raw_weapon, raw_armor, raw_craft):
    name_lower = (name or "").lower()

    # 1. Companion Equipment
    if raw_type in (70, 71, 72) and ("companion" in name_lower or "breeches" in name_lower or "breastplate" in name_lower):
        if "ring" in name_lower or "necklace" in name_lower:
            return "Companion Equipment", "Companion Jewelry"
        elif "heavy" in name_lower or "breastplate" in name_lower or "cuirass" in name_lower or raw_armor == 3:
            return "Companion Equipment", "Companion Heavy Armor"
        elif "medium" in name_lower or "jack" in name_lower or raw_armor == 2:
            return "Companion Equipment", "Companion Medium Armor"
        elif "light" in name_lower or "robe" in name_lower or raw_armor == 1:
            return "Companion Equipment", "Companion Light Armor"
        elif raw_weapon > 0 or "bow" in name_lower or "staff" in name_lower or "sword" in name_lower:
            return "Companion Equipment", "Companion Weapon"
        return "Companion Equipment", "Companion Equipment"

    # 2. Weapons
    if raw_type == 1:
        if raw_weapon == 1 or ("axe" in name_lower and "two" not in name_lower and "battle" not in name_lower):
            return "Weapons", "One-Handed Axe"
        elif raw_weapon == 2 or ("mace" in name_lower and "two" not in name_lower and "maul" not in name_lower):
            return "Weapons", "One-Handed Mace"
        elif raw_weapon == 3 or ("sword" in name_lower and "two" not in name_lower and "great" not in name_lower):
            return "Weapons", "One-Handed Sword"
        elif raw_weapon == 11 or "dagger" in name_lower:
            return "Weapons", "Dagger"
        elif raw_weapon == 5 or "battle axe" in name_lower or "battleaxe" in name_lower:
            return "Weapons", "Two-Handed Axe"
        elif raw_weapon == 6 or "maul" in name_lower or "two handed mace" in name_lower:
            return "Weapons", "Two-Handed Mace"
        elif raw_weapon == 4 or "greatsword" in name_lower or "two handed sword" in name_lower:
            return "Weapons", "Two-Handed Sword"
        elif raw_weapon == 8 or "bow" in name_lower:
            return "Weapons", "Bow"
        elif raw_weapon in (12, 13, 15) or any(w in name_lower for w in ["destruction", "inferno", "fire staff", "lightning", "frost", "ice staff", "shock staff"]):
            return "Weapons", "Destruction Staff"
        elif raw_weapon == 9 or any(w in name_lower for w in ["restoration", "healing staff", "resto"]):
            return "Weapons", "Restoration Staff"
        return "Weapons", "One-Handed"

    # 3. Jewelry (Rings & Necklaces)
    if raw_equip in (2, 12) or any(w in name_lower for w in ["ring of", "band of", "necklace", "pendant", "amulet", "choker", "talisman"]):
        if raw_equip == 2 or any(w in name_lower for w in ["necklace", "pendant", "amulet", "choker", "talisman"]):
            return "Jewelry", "Necklace"
        return "Jewelry", "Ring"

    # 4. Apparel (Armor & Shields)
    if raw_type == 2 or raw_equip == 7 or "shield" in name_lower:
        if raw_equip == 7 or "shield" in name_lower or "buckler" in name_lower or "targe" in name_lower:
            return "Apparel", "Shield"
        elif raw_armor == 3 or any(w in name_lower for w in ["cuirass", "sabatons", "gauntlets", "greaves", "pauldrons", "girdle", "great helm"]):
            return "Apparel", "Heavy Armor"
        elif raw_armor == 2 or any(w in name_lower for w in ["jack", "boots", "bracers", "guards", "arm cops", "belt", "helmet", "mask"]):
            return "Apparel", "Medium Armor"
        elif raw_armor == 1 or any(w in name_lower for w in ["robe", "jerkin", "shoes", "gloves", "hat", "breeches", "epaulets", "sash", "cap", "hood", "cowl"]):
            return "Apparel", "Light Armor"
        return "Apparel", "Apparel"

    # 5. Glyphs
    if raw_type in (20, 21, 26, 3) or "glyph of" in name_lower:
        if raw_type == 20 or "weapon" in name_lower or any(w in name_lower for w in ["flame", "frost", "poison", "shock", "hardening", "crushing", "weakening", "foulness", "absorb"]):
            return "Glyphs", "Weapon Glyph"
        elif raw_type == 21 or "armor" in name_lower or any(w in name_lower for w in ["health", "magicka", "stamina", "prismatic defense"]):
            return "Glyphs", "Armor Glyph"
        elif raw_type in (26, 3) or "jewelry" in name_lower or any(w in name_lower for w in ["recovery", "resist", "decrease", "potion"]):
            return "Glyphs", "Jewelry Glyph"
        return "Glyphs", "Glyphs"

    # 6. Furnishings
    if raw_type == 61 or "formula:" in name_lower or "praxis:" in name_lower or "diagram:" in name_lower or "pattern:" in name_lower or "blueprint:" in name_lower:
        if any(w in name_lower for w in ["recipe", "blueprint", "praxis", "diagram", "pattern", "formula", "design"]):
            return "Consumables", "Recipe / Plan"
        return "Furnishings", "Furnishings"

    # 7. Materials
    if raw_type in (41, 42, 43, 65, 67) or any(w in name_lower for w in ["tempering alloy", "dreugh wax", "rosin", "kuta", "chromium plating", "zircon plating", "iridium plating", "terne plating", "grain solvent", "elegant lining", "mastic", "honing stone", "hemming", "pitch"]):
        return "Materials", "Upgrade Temper"
    if raw_type in (35, 36) or "ore" in name_lower or "ingot" in name_lower:
        return "Materials", "Blacksmithing"
    if raw_type in (37, 38) or "rough " in name_lower or "sanded " in name_lower:
        return "Materials", "Woodworking"
    if raw_type in (39, 40) or any(w in name_lower for w in ["rawhide", "jute", "flax", "spidersilk", "leather", "hide", "silk", "rubedo"]):
        return "Materials", "Clothier"
    if raw_type in (63, 64) or any(w in name_lower for w in ["pewter dust", "copper dust", "silver dust", "electrum dust", "platinum dust", "pewter ounce", "copper ounce", "silver ounce", "electrum ounce", "platinum ounce"]):
        return "Materials", "Jewelry Crafting"
    if raw_type == 44 or "style material" in name_lower or any(w in name_lower for w in ["flint", "bone", "molybdenum", "adamantite", "obsidian", "corundum", "manganese"]):
        return "Materials", "Style Material"
    if raw_type in (45, 46, 66, 68) or any(w in name_lower for w in ["emerald", "quartz", "garnet", "sapphire", "diamond", "ruby", "citrine", "nirncrux", "titanium", "dawn-prism"]):
        return "Materials", "Trait Material"
    if raw_type in (31, 33) or any(w in name_lower for w in ["water", "entoloma", "coprinus", "russula", "columbine", "bugloss", "namira", "nirnroot", "blessed thistle", "mountain flower"]):
        return "Materials", "Alchemy"
    if raw_type in (47, 48, 49, 51, 52, 53) or any(w in name_lower for w in ["potency rune", "essence rune", "aspect rune", "kuta", "rekuta", "jejota", "denata", "oko", "makko", "deni"]):
        return "Materials", "Enchanting"
    if raw_type in (10, 34, 54) or any(w in name_lower for w in ["perfect roe", "frost mirriam", "bervez juice", "garlic", "flour", "salt", "pepper", "game", "poultry", "fish", "meat"]):
        return "Materials", "Provisioning"
    if raw_type == 62 or any(w in name_lower for w in ["regulus", "bast", "clean pelt", "mundane rune", "alchemical resin", "heartwood", "decorative wax", "ochre"]):
        return "Materials", "Furnishing Material"

    # 8. Consumables
    if raw_type == 4 or "food" in name_lower:
        return "Consumables", "Food"
    if raw_type == 12 or "drink" in name_lower:
        return "Consumables", "Drink"
    if raw_type == 7 or any(w in name_lower for w in ["potion", "sip of", "dram of", "panacea"]):
        return "Consumables", "Potion"
    if raw_type == 30 or "poison" in name_lower:
        return "Consumables", "Poison"
    if raw_type == 29 or "recipe:" in name_lower:
        return "Consumables", "Recipe / Plan"
    if raw_type == 8 or "motif" in name_lower or "style chapter" in name_lower:
        return "Consumables", "Motif"
    if raw_type in (60, 75) or "master writ" in name_lower or "sealed writ" in name_lower:
        return "Consumables", "Master Writ"
    if raw_type in (72, 73, 74, 76) or any(w in name_lower for w in ["grimoire:", "script:", "luminous ink"]):
        return "Consumables", "Scribing / Script"
    if raw_type in (18, 70) or any(w in name_lower for w in ["satchel", "crate", "chest", "box", "sack", "coffer", "bundle", "geode"]):
        return "Consumables", "Container"
    if raw_type in (56, 57, 59) or "scroll" in name_lower or "trophy" in name_lower:
        return "Consumables", "Trophy & Scroll"

    # 9. Miscellaneous
    if raw_type in (6, 47) or any(w in name_lower for w in ["siege", "trebuchet", "catapult", "ballista", "battering ram", "repair kit"]):
        return "Miscellaneous", "Siege & Repair"
    if raw_type == 16 or any(w in name_lower for w in ["bait", "worms", "crawlers", "guts", "insect parts"]):
        return "Miscellaneous", "Bait"
    if raw_type == 22 or "lockpick" in name_lower:
        return "Miscellaneous", "Lockpick"
    if raw_type == 19 or "soul gem" in name_lower:
        return "Miscellaneous", "Soul Gem"
    if "treasure map" in name_lower or "survey:" in name_lower:
        return "Miscellaneous", "Treasure Map & Survey"
    if raw_type in (9, 55, 71) or "repair kit" in name_lower:
        return "Miscellaneous", "Repair Kit"
    if raw_type == 14 or any(w in name_lower for w in ["disguise", "costume", "tabard"]):
        return "Miscellaneous", "Disguise & Tabard"

    return "Miscellaneous", "General"

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
    raw_id = row.get("itemId") if isinstance(row, dict) else None
    if type(raw_id) is not int and not (isinstance(raw_id, str) and raw_id.isascii() and raw_id.isdecimal()):
        return None
    item_id = int(raw_id)
    if item_id <= 0:
        return None

    name = row.get("name", "")
    if not isinstance(name, str):
        raise ValueError(f"Invalid source item name for ID {item_id}.")
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
    category, subcategory = get_category_subcategory(name, raw_type, raw_equip, raw_weapon, raw_armor, raw_craft)

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
    """Read one complete ID range from the fixed HTTPS source."""
    params = {"table": "minedItemSummary", "startid": start_id, "endid": end_id}
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(UESP_EXPORT_URL, params=params, timeout=(10, 60),
                                    allow_redirects=False)
            if response.status_code != 200:
                raise ValueError(f"UESP returned HTTP {response.status_code}")
            data = response.json()
            rows = data["minedItemSummary"]
            if not isinstance(rows, list) or data["numRecords"] != len(rows):
                raise ValueError("UESP response is incomplete")
            return rows, hashlib.sha256(response.content).hexdigest()
        except (requests.RequestException, ValueError, KeyError, TypeError) as error:
            if attempt == max_retries:
                raise ValueError(f"Failed to read complete UESP range {start_id}-{end_id}") from error
            time.sleep(2 ** attempt)


def acquire(output, start_id, end_id, chunk_size, delay, limit):
    if not FIRST_ID <= start_id <= end_id <= LAST_ID or not 1 <= chunk_size <= 10000 or delay < 0 or limit < 0:
        raise ValueError("Invalid UESP range, chunk size, delay or limit.")
    complete = (start_id, end_id) == (FIRST_ID, LAST_ID) and not limit
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    ranges, unnamed, seen = [], [], set()
    counts = Counter()
    accepted = 0
    with tempfile.TemporaryDirectory(prefix=".uesp-", dir=output.parent) as workspace:
        candidate = Path(workspace) / "items.json"
        with candidate.open("w", encoding="utf-8", newline="\n") as stream:
            stream.write("[")
            for first in range(start_id, end_id + 1, chunk_size):
                last = min(first + chunk_size - 1, end_id)
                print(f"Fetching UESP range {first}-{last}...", flush=True)
                rows, raw_digest = fetch_chunk(first, last)
                ranges.append({"start_id": first, "end_id": last, "count": len(rows), "raw_sha256": raw_digest})
                for row in rows:
                    item = normalize_item(row)
                    if item is None or not first <= item["game_item_id"] <= last or item["game_item_id"] in seen:
                        raise ValueError(f"Duplicate or invalid item ID in range {first}-{last}.")
                    seen.add(item["game_item_id"])
                    if isinstance(item["name"], str) and not item["name"].strip():
                        unnamed.append(item["game_item_id"])
                        continue
                    validate_item(item)
                    if accepted:
                        stream.write(",\n")
                    json.dump(item, stream, ensure_ascii=False, separators=(",", ":"))
                    counts[item["category"]] += 1
                    accepted += 1
                    if limit and accepted >= limit:
                        break
                if stream.tell() > MAX_BYTES:
                    raise ValueError("Oversized catalog export.")
                if limit and accepted >= limit:
                    break
                if last < end_id:
                    time.sleep(delay)
            stream.write("]\n")
        if not accepted:
            raise ValueError("UESP returned no usable items.")
        manifest = {
            "manifest_version": 1, "normalization_version": 1, "source_url": SOURCE_URL,
            "source_table": "minedItemSummary", "retrieved_at": utc_now(), "retrieval_id": retrieval_id(ranges),
            "source_ranges": ranges, "artifact_sha256": file_sha256(candidate), "item_count": accepted,
            "category_counts": dict(counts), "unnamed_item_ids": sorted(unnamed),
            "result": "complete" if complete else "sample",
        }
        if complete:
            validate_source(manifest)
        proof = Path(workspace) / "manifest.json"
        proof.write_bytes((json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode())
        digest = file_sha256(proof)
        proof.replace(output.with_name(f"{output.name}.{digest}.manifest.json"))
        candidate.replace(output)
    print(f"Exported {accepted} named items; {len(unnamed)} unnamed source IDs are recorded in the manifest.")
    print(f"Artifact SHA-256: {manifest['artifact_sha256']}\nManifest SHA-256: {digest}")
    return digest


def main():
    parser = argparse.ArgumentParser(description="Fetch and normalize UESP item summaries.")
    parser.add_argument("--start-id", type=int, default=FIRST_ID)
    parser.add_argument("--end-id", type=int, default=LAST_ID)
    parser.add_argument("--chunk-size", type=int, default=10000)
    parser.add_argument("--delay", type=float, default=0.2)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--output", help="Catalog export path; use a new release directory to archive it.")
    parser.add_argument("--test", action="store_true", help="Fetch an isolated ten-item sample.")
    args = parser.parse_args()
    if args.test:
        args.start_id, args.end_id, args.chunk_size, args.limit = 120000, 120050, 50, 10
    is_sample = args.start_id != FIRST_ID or args.end_id != LAST_ID or args.limit
    output = args.output or (str(Path(DEFAULT_OUTPUT_FILE).with_name("items.sample.json")) if is_sample else DEFAULT_OUTPUT_FILE)
    if is_sample and Path(output).resolve() == Path(DEFAULT_OUTPUT_FILE).resolve():
        parser.error("Choose a separate output for sample acquisitions.")
    acquire(output, args.start_id, args.end_id, args.chunk_size, args.delay, args.limit)


if __name__ == "__main__":
    main()