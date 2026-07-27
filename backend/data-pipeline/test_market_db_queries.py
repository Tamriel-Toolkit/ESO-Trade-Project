import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "exports", "eso_catalog.db"))
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("================ Database Market Data Health Check ================")

# 1. Check item_prices count per server
cursor.execute("SELECT server, COUNT(*), AVG(suggested_price) FROM item_prices GROUP BY server;")
print("\n[item_prices Summary]:")
for row in cursor.fetchall():
    print(f"  Server: {row[0]} | Total Priced Items: {row[1]} | Avg Suggested Price: {row[2]:.2f} gold")

# 2. Check guild_trader_listings count per server
cursor.execute("SELECT server, COUNT(*), AVG(price), MIN(price), MAX(price) FROM guild_trader_listings GROUP BY server;")
print("\n[guild_trader_listings Summary]:")
for row in cursor.fetchall():
    print(f"  Server: {row[0]} | Total Listings: {row[1]} | Avg Price: {row[2]:.2f} gold | Min: {row[3]} | Max: {row[4]}")

# 3. Test joining items + item_prices
print("\n[Sample Joined Items + Prices]:")
cursor.execute("""
    SELECT i.game_item_id, i.name, i.category, ip.server, ip.suggested_price, ip.avg_price
    FROM items i
    JOIN item_prices ip ON i.game_item_id = ip.game_item_id
    LIMIT 5;
""")
for row in cursor.fetchall():
    print(f"  [{row[0]}] {row[1]} ({row[2]}) - {row[3]} Server: Suggested={row[4]}g, Avg={row[5]}g")

# 4. Test joining items + listings + item_prices for Value Index
print("\n[Sample Top Value Listings (Highest Value Index = Suggested Price / Price)]:")
cursor.execute("""
    SELECT 
        gtl.id AS listing_id,
        gtl.game_item_id,
        gtl.server,
        gtl.price AS listed_price,
        gtl.guild_name,
        gtl.location,
        i.name AS item_name,
        ip.suggested_price,
        CAST(ip.suggested_price AS REAL) / gtl.price AS value_index
    FROM guild_trader_listings gtl
    JOIN items i ON gtl.game_item_id = i.game_item_id
    JOIN item_prices ip ON gtl.game_item_id = ip.game_item_id AND gtl.server = ip.server
    WHERE gtl.price > 0
    ORDER BY value_index DESC
    LIMIT 5;
""")
for row in cursor.fetchall():
    print(f"  Listing #{row[0]}: '{row[6]}' | Listed: {row[3]}g | Suggested: {row[7]}g | Value Index: {row[8]:.2f}x | Guild: {row[4]} ({row[5]})")

conn.close()
print("\nDatabase queries test completed cleanly!")
