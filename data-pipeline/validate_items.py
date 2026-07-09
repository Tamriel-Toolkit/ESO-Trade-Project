import json
import sys

try:
    with open('exports/items.json', 'r') as f:
        items = json.load(f)
except Exception as e:
    print(f"Error loading JSON: {e}")
    sys.exit(1)

if not isinstance(items, list):
    print("Error: Root element is not a list")
    sys.exit(1)

required_fields = ["game_item_id", "name", "item_type", "category", "subcategory", "rarity", "icon_url", "metadata"]

for idx, item in enumerate(items):
    for field in required_fields:
        if field not in item:
            print(f"Error: Item at index {idx} (ID {item.get('game_item_id')}) missing field '{field}'")
            sys.exit(1)

    if not isinstance(item["game_item_id"], int):
        print(f"Error: Item {idx} game_item_id is not an int")
        sys.exit(1)

    if not isinstance(item["metadata"], dict):
        print(f"Error: Item {idx} metadata is not a dict")
        sys.exit(1)

print(f"Successfully validated {len(items)} items.")
