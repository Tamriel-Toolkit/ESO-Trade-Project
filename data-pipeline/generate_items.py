import json
import re
import os
import csv

items = []
seen_ids = set()

def add_item(item_id, name, item_type, category, subcategory, rarity, icon, metadata=None):
    try:
        item_id_int = int(item_id)
    except Exception:
        return
    if item_id_int in seen_ids:
        return
    if not name or name.startswith('/esoui') or name == "nil" or name == "Unknown Item":
        return

    seen_ids.add(item_id_int)
    items.append({
        "game_item_id": item_id_int,
        "name": name,
        "item_type": item_type,
        "category": category,
        "subcategory": str(subcategory),
        "rarity": int(rarity) if rarity else 1,
        "icon_url": f"https://esoicons.uesp.net{icon}" if icon.startswith('/') else icon,
        "metadata": metadata or {}
    })

def process_csvs():
    csv_dir = "uesp-esoapps/EsoParseTables/"
    if not os.path.exists(csv_dir):
        print(f"Warning: CSV directory {csv_dir} not found.")
        return

    for filename in sorted(os.listdir(csv_dir)):
        if filename.endswith(".csv") and filename.startswith("item-"):
            filepath = os.path.join(csv_dir, filename)
            with open(filepath, 'r', encoding='latin-1') as f:
                reader = csv.reader(f)
                try:
                    header = next(reader)
                    idx_id = header.index("itemId")
                    idx_name = header.index("name")
                    idx_type = header.index("type")
                    idx_quality = header.index("quality")
                    idx_icon = header.index("icon")
                    idx_set = header.index("setName")
                    idx_armor = header.index("armorType")
                    idx_weapon = header.index("weaponType")

                    for row in reader:
                        try:
                            if not row or len(row) <= max(idx_id, idx_name, idx_type): continue
                            name = row[idx_name]
                            if "^" in name: name = name.split("^")[0]

                            raw_type = int(row[idx_type])
                            item_type = "Equipment"
                            category = "Armor" if raw_type == 2 else "Weapon"

                            raw_armor = int(row[idx_armor]) if row[idx_armor] else 0
                            raw_weapon = int(row[idx_weapon]) if row[idx_weapon] else 0

                            subcategory = "Unknown"
                            if raw_type == 2:
                                if raw_armor == 1: subcategory = "Light Armor"
                                elif raw_armor == 2: subcategory = "Medium Armor"
                                elif raw_armor == 3: subcategory = "Heavy Armor"
                            else:
                                w_map = {1:"Axe", 2:"Mace", 3:"Sword", 8:"Bow", 9:"Destruction Staff", 12:"Restoration Staff"}
                                subcategory = w_map.get(raw_weapon, "Weapon")

                            add_item(row[idx_id], name, item_type, category, subcategory, row[idx_quality], row[idx_icon], {"set": row[idx_set]})
                        except Exception:
                            continue # Skip malformed rows
                except Exception:
                    continue

def process_recipes():
    recipe_php = "uesp-esolog/esoRecipeData.php"
    if not os.path.exists(recipe_php):
        print(f"Warning: Recipe file {recipe_php} not found.")
        return

    with open(recipe_php, 'r', encoding='latin-1') as f:
        content = f.read()
        recipe_block = re.search(r'\$ESO_RECIPE_INFO\s*=\s*array\s*\((.*?)\);', content, re.DOTALL)
        if recipe_block:
            recipe_matches = re.finditer(r'(\d+)\s*=>\s*array\((\d+),\s*"(.*?)",\s*"(.*?)",\s*(\d+)\)', recipe_block.group(1))
            for m in recipe_matches:
                recipe_id, result_id, cat, name, qual = m.groups()
                add_item(result_id, name, "Consumable", "Food/Drink", cat, qual, "/esoui/art/icons/placeholder.dds")
                add_item(recipe_id, f"Recipe: {name}", "Knowledge", "Recipe", "Provisioning", qual, "/esoui/art/icons/inv_recipe_provisioning.dds", {"result_item_id": int(result_id)})

def main():
    import sys
    limit = 1000
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            print(f"Invalid limit '{sys.argv[1]}', using default 1000.")

    process_csvs()
    process_recipes()

    # Key items to ensure they are present
    add_item(70, "Cured Kwama Leggings", "Equipment", "Armor", "Medium Armor", 1, "/esoui/art/icons/gear_kwama_hide_legs_a.dds")
    add_item(139, "Rough Ash Bow", "Equipment", "Weapon", "Bow", 1, "/esoui/art/icons/weapon_bow_ash_a.dds")

    items.sort(key=lambda x: x["game_item_id"])

    # Slice items based on limit
    final_items = items[:limit] if limit > 0 else items

    os.makedirs("exports", exist_ok=True)
    with open("exports/items.json", "w") as f:
        json.dump(final_items, f, indent=2)
    print(f"Successfully generated {len(final_items)} items in exports/items.json")

if __name__ == "__main__":
    main()
