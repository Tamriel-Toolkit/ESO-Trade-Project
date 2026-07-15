import json
import sys
import os

def test_retrieval():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.abspath(os.path.join(script_dir, "..", "exports", "items.json"))
    print(f"Loading {filepath}...")
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            items = json.load(f)
    except Exception as e:
        print(f"Error loading catalog: {e}")
        sys.exit(1)

    total_items = len(items)
    print(f"Successfully loaded {total_items} items.")

    # Counters
    set_items = []
    weapons = []
    armor = []
    recipes = []
    motifs = []

    for item in items:
        meta = item.get("metadata", {})
        
        # Check for sets
        if "set" in meta:
            set_items.append(item)
            
        # Check types
        item_type = item.get("item_type")
        category = item.get("category")
        
        if category == "Weapon":
            weapons.append(item)
        elif category == "Armor":
            armor.append(item)
        elif item_type == "Recipe":
            recipes.append(item)
        elif item_type == "Motif":
            motifs.append(item)

    print("\n=== CATALOG STATISTICS ===")
    print(f"Total Unique Items: {total_items}")
    print(f"Weapons: {len(weapons)}")
    print(f"Armor Pieces: {len(armor)}")
    print(f"Set Items: {len(set_items)}")
    print(f"Recipes: {len(recipes)}")
    print(f"Crafting Motifs: {len(motifs)}")

    print("\n=== SAMPLE DATA RETRIEVAL ===")
    
    # 1. Sample Set Item
    if set_items:
        sample_set = set_items[0]
        print("\n[Sample Set Item]")
        print(f"  ID: {sample_set['game_item_id']}")
        print(f"  Name: {sample_set['name']}")
        print(f"  Category: {sample_set['category']} ({sample_set['subcategory']})")
        print(f"  Set: {sample_set['metadata']['set']['name']} (ID: {sample_set['metadata']['set'].get('id', 'N/A')})")
        print(f"  Bonuses:")
        for idx, bonus in enumerate(sample_set['metadata']['set']['bonuses'], 1):
            print(f"    ({idx} pcs): {bonus}")
            
    # 2. Sample Weapon
    if weapons:
        sample_weapon = weapons[0]
        print("\n[Sample Weapon]")
        print(f"  ID: {sample_weapon['game_item_id']}")
        print(f"  Name: {sample_weapon['name']}")
        print(f"  Subcategory: {sample_weapon['subcategory']}")
        print(f"  Rarity: {sample_weapon['rarity']}")
        if "stats" in sample_weapon['metadata']:
            print(f"  Weapon Power: {sample_weapon['metadata']['stats'].get('weapon_power')}")

    # 3. Sample Motif
    if motifs:
        sample_motif = motifs[0]
        print("\n[Sample Crafting Motif]")
        print(f"  ID: {sample_motif['game_item_id']}")
        print(f"  Name: {sample_motif['name']}")
        print(f"  Rarity: {sample_motif['rarity']}")
        if "style_id" in sample_motif['metadata']:
            print(f"  Style ID: {sample_motif['metadata']['style_id']}")

if __name__ == "__main__":
    test_retrieval()
