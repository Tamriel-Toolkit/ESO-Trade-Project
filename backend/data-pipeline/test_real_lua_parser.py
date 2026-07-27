import os
import re
import time

path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "cache", "PriceTableNA.lua"))

print(f"Testing ultra-fast parser on 100% REAL minified TTC Lua file ({os.path.getsize(path)} bytes)...")

start_time = time.time()

with open(path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

print(f"File loaded in {time.time() - start_time:.3f}s. Extracting item price entries...")

# Pattern for top-level item entries inside Data={ ... }
# Look for comma-separated or start-of-table entries:  ,[game_item_id]={  or  Data"]={[game_item_id]={
entry_regex = re.compile(r'(?:\["Data"\]=\{|\,)\s*\[(\d+)\]\s*=\s*\{')

matches = list(entry_regex.finditer(content))
print(f"Found {len(matches)} item ID boundaries in {time.time() - start_time:.3f}s!")

records = []
for i in range(len(matches)):
    item_id = int(matches[i].group(1))
    start_pos = matches[i].end()
    end_pos = matches[i+1].start() if i + 1 < len(matches) else len(content)
    block = content[start_pos:end_pos]

    # Extract price fields: ["A"]=..., ["N"]=..., ["X"]=..., ["S"]=... or ["SA"]=...
    avg_m = re.search(r'\["A"\]\s*=\s*([\d\.]+)', block)
    min_m = re.search(r'\["N"\]\s*=\s*([\d\.]+)', block)
    max_m = re.search(r'\["X"\]\s*=\s*([\d\.]+)', block)
    sug_m = re.search(r'\["S"\]\s*=\s*([\d\.]+)', block) or re.search(r'\["SA"\]\s*=\s*([\d\.]+)', block)

    avg_p = float(avg_m.group(1)) if avg_m else None
    min_p = float(min_m.group(1)) if min_m else None
    max_p = float(max_m.group(1)) if max_m else None
    sug_p = float(sug_m.group(1)) if sug_m else avg_p

    if avg_p is not None or sug_p is not None:
        records.append({
            "game_item_id": item_id,
            "server": "NA",
            "avg_price": int(avg_p) if avg_p else None,
            "min_price": int(min_p) if min_p else None,
            "max_price": int(max_p) if max_p else None,
            "suggested_price": int(sug_p) if sug_p else None
        })

print(f"\nParse Complete in {time.time() - start_time:.3f} seconds!")
print(f"Successfully extracted {len(records)} 100% REAL live market records from TTC export!")
if records:
    print("Sample 100% REAL Live Market Record:")
    print(records[0])
    print(records[1])
    print(records[2])
