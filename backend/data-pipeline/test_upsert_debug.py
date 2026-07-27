from fetch_market_data import upsert_market_data, DEFAULT_DB_PATH
from test_real_lua_parser import records
import sqlite3

print(f"Loaded {len(records)} sample records from real Lua parser.")

conn = sqlite3.connect(DEFAULT_DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT game_item_id FROM items;")
valid_item_ids = set(row[0] for row in cursor.fetchall())
print(f"Total master item IDs in database: {len(valid_item_ids)}")

valid_records = [r for r in records if r["game_item_id"] in valid_item_ids]
print(f"Matching valid records between Lua export and DB: {len(valid_records)}")

if valid_records:
    cnt = upsert_market_data(conn, valid_records)
    print(f"Successfully upserted {cnt} records into database!")

conn.close()
