import sqlite3
import json
import os

def ensure_schema_and_seed(cursor, conn):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            game_item_id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            subcategory TEXT,
            rarity INTEGER,
            icon_url TEXT,
            metadata TEXT
        );
    """)
    cursor.execute("SELECT COUNT(*) FROM items")
    if cursor.fetchone()[0] == 0:
        sample_items = [
            (1129, "Werewolf Hide King Deleyn's Longbow", "Weapon", "Bow", 5, "", '{"type": "Bow"}'),
            (1321, "Maple Bow", "Weapon", "Bow", 5, "", '{"type": "Bow"}'),
            (1727, "Brackenleaf's Bough", "Weapon", "Bow", 5, "", '{"type": "Bow"}'),
            (2501, "Ebony-Inlaid Longbow", "Weapon", "Bow", 5, "", '{"type": "Bow"}'),
            (4317, "Naryu's Sniper's Bow", "Weapon", "Bow", 5, "", '{"type": "Bow"}'),
            (68447, "Briarheart Jack", "Armor", "Medium Armor", 4, "", '{"set": {"name": "Briarheart"}}'),
            (68448, "Briarheart Boots", "Armor", "Medium Armor", 4, "", '{"set": {"name": "Briarheart"}}'),
            (68449, "Briarheart Bracers", "Armor", "Medium Armor", 4, "", '{"set": {"name": "Briarheart"}}'),
            (68450, "Briarheart Helmet", "Armor", "Medium Armor", 4, "", '{"set": {"name": "Briarheart"}}'),
            (68451, "Briarheart Guards", "Armor", "Medium Armor", 4, "", '{"set": {"name": "Briarheart"}}'),
            (1001, "Iron Sword", "Weapon", "One-Handed Sword", 1, "", '{}'),
            (1002, "Iron Dagger", "Weapon", "Dagger", 1, "", '{}'),
            (1003, "Iron Axe", "Weapon", "Axe", 1, "", '{}'),
            (2001, "Iron Cuirass", "Armor", "Heavy Armor", 1, "", '{}'),
            (2002, "Iron Greaves", "Armor", "Heavy Armor", 1, "", '{}'),
            (3001, "Alit Hide", "Other", "Trophy", 1, "", '{}'),
            (4001, "Oak Chair", "Furnishing", "Seating", 1, "", '{}'),
            (5001, "Baked Apples", "Consumable", "Food", 1, "", '{}'),
            (6001, "Recipe: Apple Soup", "Recipe", "Provisioning", 1, "", '{}')
        ]
        cursor.executemany("INSERT OR IGNORE INTO items VALUES (?, ?, ?, ?, ?, ?, ?)", sample_items)
        conn.commit()

def test_db():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.environ.get("DB_PATH", os.path.abspath(os.path.join(script_dir, "..", "exports", "eso_catalog.db")))
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    ensure_schema_and_seed(cursor, conn)

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
