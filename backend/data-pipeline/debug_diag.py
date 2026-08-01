import zipfile
import sqlite3
import os
import sys
import re

sys.path.append('backend/data-pipeline')
from fetch_market_data import parse_ttc_lookup_table

db_path = 'backend/exports/eso_catalog.db'
conn = sqlite3.connect(db_path)

zip_path = 'backend/exports/cache/PriceTableNA_real.zip'
with zipfile.ZipFile(zip_path) as z:
    lookup_str = z.read('ItemLookUpTable_EN.lua').decode('utf-8', errors='ignore')
    price_content = z.read('PriceTableNA.lua').decode('utf-8', errors='ignore')

lookup_mapping = parse_ttc_lookup_table(lookup_str, conn)

def parse_ttc_lua_content_fast(content, server, lookup_mapping):
    data_start = content.find('["Data"]')
    if data_start == -1:
        return []
    
    idx = content.find('{', data_start)
    if idx == -1:
        return []
    
    tokens = re.finditer(r'\{|\}|\[(\d+)\]\s*=\s*\{', content[idx:])
    
    depth = 0
    item_starts = []
    
    for t in tokens:
        val = t.group(0)
        if val == '{':
            depth += 1
        elif val == '}':
            depth -= 1
        else: # match [digits]={
            if depth == 1:
                ttc_id = int(t.group(1))
                item_starts.append((ttc_id, idx + t.start(), idx + t.end()))
            depth += 1

    print(f"Fast linear scanner found {len(item_starts)} top-level item entries at depth 1!")
    
    parsed_records = []
    unmapped = 0

    for i in range(len(item_starts)):
        ttc_id, start_pos, end_pos = item_starts[i]
        next_start = item_starts[i+1][1] if i + 1 < len(item_starts) else len(content)
        block = content[end_pos:next_start]

        if lookup_mapping:
            game_item_id = lookup_mapping.get(ttc_id)
            if not game_item_id:
                unmapped += 1
                continue
        else:
            game_item_id = ttc_id

        # Find leaf stat dicts: { ... ["A"]= ... } or { ... ["S"]= ... }
        sub_blocks = re.findall(r'\{[^{}]*?\["A"\]=[^{}]*?\}', block)
        if not sub_blocks:
            sub_blocks = re.findall(r'\{[^{}]*?\["S"\]=[^{}]*?\}', block)
        
        if not sub_blocks:
            continue

        best_stats = None
        max_ec = -1
        max_ac = -1

        for sb in sub_blocks:
            ec_m = re.search(r'\["EC"\]\s*=\s*(\d+)', sb)
            ac_m = re.search(r'\["AC"\]\s*=\s*(\d+)', sb)
            a_m = re.search(r'\["A"\]\s*=\s*([\d\.]+)', sb)
            s_m = re.search(r'\["S"\]\s*=\s*([\d\.]+)', sb) or re.search(r'\["SA"\]\s*=\s*([\d\.]+)', sb)
            n_m = re.search(r'\["N"\]\s*=\s*([\d\.]+)', sb)
            x_m = re.search(r'\["X"\]\s*=\s*([\d\.]+)', sb)

            ec = int(ec_m.group(1)) if ec_m else 0
            ac = int(ac_m.group(1)) if ac_m else 0

            if ec > max_ec or (ec == max_ec and ac > max_ac) or best_stats is None:
                max_ec = ec
                max_ac = ac
                avg_p = float(a_m.group(1)) if a_m else None
                sug_p = float(s_m.group(1)) if s_m else avg_p
                min_p = float(n_m.group(1)) if n_m else None
                max_p = float(x_m.group(1)) if x_m else None

                if avg_p is not None or sug_p is not None:
                    final_sug = sug_p if sug_p is not None else avg_p
                    final_avg = avg_p if avg_p is not None else final_sug
                    best_stats = {
                        'game_item_id': game_item_id,
                        'server': server,
                        'avg_price': int(final_avg),
                        'min_price': int(min_p) if min_p is not None else int(final_avg),
                        'max_price': int(max_p) if max_p is not None else int(final_avg),
                        'suggested_price': int(final_sug)
                    }

        if best_stats:
            parsed_records.append(best_stats)

    print(f"Parsed {len(parsed_records)} valid item records ({unmapped} unmapped skipped).")
    return parsed_records

records = parse_ttc_lua_content_fast(price_content, 'NA', lookup_mapping)
sanded = [r for r in records if r['game_item_id'] == 64502]
print("\nSanded Ruby Ash (game_item_id = 64502) Result:")
print(sanded)
