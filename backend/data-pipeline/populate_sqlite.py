#!/usr/bin/env python3
"""Safely upsert the UESP master item catalog into the application database."""

import argparse
import json
import os
import sqlite3
import time


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_JSON_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "items.json"))
DEFAULT_DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))


def catalog_row(item):
    metadata = item.get("metadata") or {}
    set_data = metadata.get("set") or {}
    icon_url = item.get("icon_url")
    return (
        int(item["game_item_id"]),
        item.get("name") or f"ESO Item {item['game_item_id']}",
        item.get("category"),
        item.get("subcategory"),
        int(item.get("rarity") or 1),
        item.get("item_type"),
        set_data.get("name"),
        icon_url,
        json.dumps(metadata, ensure_ascii=False),
        icon_url,
    )


def populate_database(json_path=DEFAULT_JSON_PATH, db_path=DEFAULT_DB_PATH):
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Catalog export not found: {json_path}. Run fetch_and_ingest.py first.")

    print(f"Reading catalog data from {json_path}...")
    with open(json_path, "r", encoding="utf-8") as catalog_file:
        items = json.load(catalog_file)

    if not isinstance(items, list):
        raise ValueError("Catalog export must contain a JSON array.")

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.execute("PRAGMA foreign_keys = ON;")
    connection.execute("PRAGMA busy_timeout = 5000;")

    started_at = time.time()
    try:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS items (
                game_item_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                subcategory TEXT,
                rarity INTEGER DEFAULT 1,
                type TEXT,
                set_name TEXT,
                icon TEXT,
                metadata TEXT,
                icon_url TEXT
            );
        """)
        connection.execute("CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_items_subcategory ON items(subcategory);")
        connection.execute("CREATE INDEX IF NOT EXISTS idx_items_set_name ON items(set_name);")

        upsert_sql = """
            INSERT INTO items (
                game_item_id, name, category, subcategory, rarity,
                type, set_name, icon, metadata, icon_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(game_item_id) DO UPDATE SET
                name = excluded.name,
                category = excluded.category,
                subcategory = excluded.subcategory,
                rarity = excluded.rarity,
                type = excluded.type,
                set_name = excluded.set_name,
                icon = excluded.icon,
                metadata = excluded.metadata,
                icon_url = excluded.icon_url;
        """

        connection.execute("BEGIN IMMEDIATE;")
        batch_size = 5000
        for offset in range(0, len(items), batch_size):
            batch = [catalog_row(item) for item in items[offset:offset + batch_size]]
            connection.executemany(upsert_sql, batch)
            print(f"  Upserted {min(offset + len(batch), len(items))}/{len(items)} items...")
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(f"Safely upserted {len(items)} catalog items in {time.time() - started_at:.2f} seconds.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default=DEFAULT_JSON_PATH, help="Path to the UESP catalog JSON export.")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help="Path to the SQLite application database.")
    args = parser.parse_args()
    populate_database(os.path.abspath(args.input), os.path.abspath(args.db))
