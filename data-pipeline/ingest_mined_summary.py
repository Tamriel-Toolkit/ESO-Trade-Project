import json
import csv
import sys
import os
import argparse

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

def parse_csv(filepath):
    items = []

    # Validation counters
    items_with_traits = 0
    items_with_sets = 0
    items_with_styles = 0
    items_with_quality_ranges = 0

    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                item_id = int(row.get("itemId", 0))
            except ValueError:
                continue

            if item_id == 0:
                continue

            name = row.get("name", "")
            if "^" in name:
                name = name.split("^")[0]

            raw_type = int(row.get("type", -1)) if row.get("type", "").lstrip('-').isdigit() else -1
            raw_equip = int(row.get("equipType", -1)) if row.get("equipType", "").lstrip('-').isdigit() else -1
            raw_weapon = int(row.get("weaponType", -1)) if row.get("weaponType", "").lstrip('-').isdigit() else -1
            raw_armor = int(row.get("armorType", -1)) if row.get("armorType", "").lstrip('-').isdigit() else -1
            raw_craft = int(row.get("craftType", -1)) if row.get("craftType", "").lstrip('-').isdigit() else -1
            raw_bind = int(row.get("bindType", -1)) if row.get("bindType", "").lstrip('-').isdigit() else -1
            raw_vendor_trash = int(row.get("isVendorTrash", 0)) if row.get("isVendorTrash", "").lstrip('-').isdigit() else 0

            quality_str = row.get("quality", "1")
            rarity, quality_range = parse_quality(quality_str)

            if quality_range:
                items_with_quality_ranges += 1

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
            trait_id_str = row.get("trait", "")
            if trait_desc or (trait_id_str.lstrip('-').isdigit() and int(trait_id_str) > 0):
                items_with_traits += 1
                if trait_id_str.lstrip('-').isdigit():
                    metadata["trait_id"] = int(trait_id_str)
                if trait_desc:
                    metadata["trait_description"] = trait_desc

            if row.get("traitAbilityDesc"):
                metadata["trait_ability"] = row.get("traitAbilityDesc")

            # Style
            if row.get("style", "").lstrip('-').isdigit() and int(row.get("style")) > 0:
                metadata["style_id"] = int(row.get("style"))
                items_with_styles += 1

            # Set
            if row.get("setName"):
                items_with_sets += 1
                set_data = {"name": row.get("setName"), "bonuses": []}

                if row.get("setId") and row.get("setId").isdigit():
                    set_data["id"] = int(row.get("setId"))

                for i in range(1, 6):
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
            if row.get("armorRating") and row.get("armorRating") != "0": stats["armor_rating"] = row.get("armorRating")
            if row.get("weaponPower") and row.get("weaponPower") != "0": stats["weapon_power"] = row.get("weaponPower")
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

            item = {
                "game_item_id": item_id,
                "name": name,
                "item_type": item_type,
                "category": category,
                "subcategory": str(subcategory),
                "rarity": rarity,
                "icon_url": icon,
                "metadata": metadata
            }
            items.append(item)

    print("\n--- Validation Report ---")
    print(f"Total items parsed: {len(items)}")
    print(f"Items with traits: {items_with_traits}")
    print(f"Items with sets: {items_with_sets}")
    print(f"Items with styles: {items_with_styles}")
    print(f"Items with quality ranges: {items_with_quality_ranges}")
    print("-------------------------\n")
    return items

def main():
    parser = argparse.ArgumentParser(description="Ingest minedItemSummary dataset")
    parser.add_argument("input_file", help="Path to minedItemSummary CSV file")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of output items (0 for no limit)")
    args = parser.parse_args()

    if not os.path.exists(args.input_file):
        print(f"Error: File {args.input_file} not found.")
        sys.exit(1)

    print(f"Parsing {args.input_file}...")
    items = parse_csv(args.input_file)

    if args.limit > 0:
        items = items[:args.limit]

    os.makedirs("exports", exist_ok=True)
    with open("exports/items.json", "w", encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated {len(items)} items in exports/items.json")

if __name__ == "__main__":
    main()
