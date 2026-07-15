import sqlite3
import json
import os
import sys
import time

def populate_database():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.abspath(os.path.join(script_dir, "..", "exports", "items.json"))
    db_path = os.path.abspath(os.path.join(script_dir, "..", "exports", "eso_catalog.db"))

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
    conn.execute("PRAGMA foreign_keys = ON;")
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

    # Create characters and knowledge tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        class TEXT,
        level INTEGER,
        is_master_crafter INTEGER DEFAULT 0,
        last_sync_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge (
        character_id INTEGER,
        game_item_id INTEGER,
        is_known INTEGER DEFAULT 1,
        learned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (character_id, game_item_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
    );
    """)

    # Create remaining Phase 2 tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS item_prices (
        game_item_id INTEGER,
        server TEXT,
        avg_price INTEGER,
        min_price INTEGER,
        max_price INTEGER,
        suggested_price INTEGER,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (game_item_id, server),
        FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS guild_trader_listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_item_id INTEGER,
        server TEXT,
        price INTEGER,
        quantity INTEGER,
        guild_name TEXT,
        location TEXT,
        expires_at TEXT,
        discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_inventory (
        character_id INTEGER,
        game_item_id INTEGER,
        quantity INTEGER DEFAULT 1,
        PRIMARY KEY (character_id, game_item_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS watchlists (
        character_id INTEGER,
        game_item_id INTEGER,
        target_price INTEGER,
        is_notified INTEGER DEFAULT 0,
        PRIMARY KEY (character_id, game_item_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
        FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
    );
    """)

    # Create index
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_game_item_id ON guild_trader_listings(game_item_id);")

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
