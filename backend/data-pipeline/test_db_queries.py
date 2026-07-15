import sqlite3
import json
import os

def test_db():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.abspath(os.path.join(script_dir, "..", "exports", "eso_catalog.db"))
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Select the top 5 legendary (rarity=5) bows (subcategory='Bow')
    print("\n[SQL Query 1: Top 5 Legendary Bows]")
    query_1 = """
    SELECT game_item_id, name, subcategory, rarity 
    FROM items 
    WHERE category = 'Weapon' AND subcategory = 'Bow' AND rarity = 5 
    LIMIT 5;
    """
    cursor.execute(query_1)
    rows = cursor.fetchall()
    for row in rows:
        print(f"  ID: {row[0]:<6} | Name: {row[1]:<35} | Rarity: {row[3]}")

    # 2. Select items belonging to the 'Briarheart' set
    print("\n[SQL Query 2: Items in the 'Briarheart' set]")
    # We query by matching the metadata JSON string
    query_2 = """
    SELECT game_item_id, name, category, subcategory 
    FROM items 
    WHERE metadata LIKE '%"set": {"name": "Briarheart"%' 
    LIMIT 5;
    """
    cursor.execute(query_2)
    rows = cursor.fetchall()
    for row in rows:
        print(f"  ID: {row[0]:<6} | Name: {row[1]:<35} | {row[2]} ({row[3]})")

    # 3. Analyze count by Category
    print("\n[SQL Query 3: Item Count by Category]")
    query_3 = """
    SELECT category, count(*) as count 
    FROM items 
    GROUP BY category 
    ORDER BY count DESC;
    """
    cursor.execute(query_3)
    rows = cursor.fetchall()
    for row in rows:
        print(f"  Category: {row[0]:<15} | Count: {row[1]}")

    conn.close()

if __name__ == "__main__":
    test_db()
