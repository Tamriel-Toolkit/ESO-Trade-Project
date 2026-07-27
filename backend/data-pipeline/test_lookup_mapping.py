import sqlite3
import zipfile
import os
import re
import time
from test_real_lua_parser import records

zip_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache", "PriceTableNA_real.zip"))
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "eso_catalog.db"))

print(f"Building master lookup table from database: {db_path}...")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Map lowercase item name -> list of game_item_ids
cursor.execute("SELECT LOWER(name), game_item_id FROM items WHERE name IS NOT NULL AND name != ''")
name_to_game_id = {}
for name_lower, g_id in cursor.fetchall():
    if name_lower not in name_to_game_id:
        name_to_game_id[name_lower] = g_id

print(f"Loaded {len(name_to_game_id)} unique item names from master database.")

print("Parsing ItemLookUpTable_EN.lua...")
start_t = time.time()
with zipfile.ZipFile(zip_path) as z:
    lookup_str = z.read("ItemLookUpTable_EN.lua").decode("utf-8", errors="ignore")

# Pattern for ["item name"]={[cat_id]=ttc_id,}
lookup_regex = re.compile(r'\["([^"]+)"\]=\{[^\}]*?=(\d+),?\s*\}')

ttc_id_to_game_id = {}
matched_names = 0

for m in lookup_regex.finditer(lookup_str):
    name_lower = m.group(1).lower()
    ttc_id = int(m.group(2))
    if name_lower in name_to_game_id:
        g_id = name_to_game_id[name_lower]
        ttc_id_to_game_id[ttc_id] = g_id
        matched_names += 1

print(f"Parsed {matched_names} TTC item name mappings in {time.time() - start_t:.3f}s!")
print(f"Total TTC IDs mapped directly to game_item_id: {len(ttc_id_to_game_id)}")

# Now test mapping parsed PriceTableNA.lua records
matched_records = 0
mapped_records = []

for r in records:
    ttc_id = r["game_item_id"]
    if ttc_id in ttc_id_to_game_id:
        g_id = ttc_id_to_game_id[ttc_id]
        mapped_records.append({
            "game_item_id": g_id,
            "server": r["server"],
            "avg_price": r["avg_price"],
            "min_price": r["min_price"],
            "max_price": r["max_price"],
            "suggested_price": r["suggested_price"]
        })

print(f"SUCCESS! Mapped {len(mapped_records)} of {len(records)} REAL live market price records directly to master catalog items!")
if mapped_records:
    print("Sample mapped record:")
    sample_id = mapped_records[0]["game_item_id"]
    cursor.execute("SELECT name, category, subcategory, rarity FROM items WHERE game_item_id = ?", (sample_id,))
    item_info = cursor.fetchone()
    print("  Game Item:", item_info)
    print("  Prices:", mapped_records[0])

conn.close()
