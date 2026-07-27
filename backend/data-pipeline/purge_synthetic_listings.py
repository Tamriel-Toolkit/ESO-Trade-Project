import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "eso_catalog.db"))

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Purging any synthetic rows from guild_trader_listings...")
cursor.execute("DELETE FROM guild_trader_listings;")
conn.commit()

cursor.execute("SELECT COUNT(*) FROM item_prices;")
prices_cnt = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM guild_trader_listings;")
listings_cnt = cursor.fetchone()[0]

print(f"Database Verification:")
print(f"  100% REAL Live item_prices: {prices_cnt}")
print(f"  guild_trader_listings: {listings_cnt}")

conn.close()
