import sqlite3
import json
import os
import sys
import time

def populate_database():
    json_path = "exports/items.json"
    db_path = "exports/eso_catalog.db"

    print(f"Reading catalog data from {json_path}...")
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found. Please run fetch_and_ingest.py first.")
        sys.exit(1)

    with open(json_path, "r", encoding="utf-8") as f:
        items = json.load(f)

    total_items = len(items)
    print(f"Loaded {total_items} items. Connecting to SQLite database at {db_path}...")

    # Connect to SQLite (creates the file if it does not exist)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Drop existing table if any
    cursor.execute("DROP TABLE IF EXISTS items;")

    # Create the items table matching the PostgreSQL schema column taxonomy
    cursor.execute("""
    CREATE TABLE items (
        id TEXT PRIMARY KEY,
        game_item_id INTEGER UNIQUE,
        name TEXT,
        item_type TEXT,
        category TEXT,
        subcategory TEXT,
        rarity INTEGER,
        icon_url TEXT,
        metadata TEXT
    );
    """)

    # Create helper function to generate uuid-like strings or use sequential keys since SQLite doesn't have native UUIDs
    # ZeniMax game_item_id is unique, so we can use "item_ID" as the text PK id
    print("Populating database...")
    start_time = time.time()

    # Prepare batch insert
    insert_query = """
    INSERT INTO items (id, game_item_id, name, item_type, category, subcategory, rarity, icon_url, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """

    batch_size = 5000
    batch = []
    inserted_count = 0

    for item in items:
        game_id = item["game_item_id"]
        # Generate clean string PK, e.g., 'item-000120000'
        uuid_id = f"item-{game_id:09d}"
        
        row = (
            uuid_id,
            game_id,
            item["name"],
            item["item_type"],
            item["category"],
            item["subcategory"],
            item["rarity"],
            item["icon_url"],
            json.dumps(item["metadata"], ensure_ascii=False)
        )
        batch.append(row)

        if len(batch) >= batch_size:
            cursor.executemany(insert_query, batch)
            inserted_count += len(batch)
            print(f"   Inserted {inserted_count}/{total_items} items...")
            batch = []

    # Insert remaining records
    if batch:
        cursor.executemany(insert_query, batch)
        inserted_count += len(batch)

    # Commit changes and create indexes for performance
    print("Creating indexes on search columns...")
    cursor.execute("CREATE INDEX idx_game_item_id ON items(game_item_id);")
    cursor.execute("CREATE INDEX idx_category ON items(category);")
    cursor.execute("CREATE INDEX idx_subcategory ON items(subcategory);")
    cursor.execute("CREATE INDEX idx_item_type ON items(item_type);")
    
    conn.commit()
    elapsed = time.time() - start_time
    print(f"\nSuccessfully populated database in {elapsed:.2f} seconds!")

    # Verify database count
    cursor.execute("SELECT count(*) FROM items;")
    db_count = cursor.fetchone()[0]
    print(f"Verification: SQLite database table 'items' contains {db_count} records.")

    conn.close()

if __name__ == "__main__":
    populate_database()
