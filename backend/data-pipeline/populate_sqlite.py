#!/usr/bin/env python3
"""Verify and safely publish a UESP catalog to the application database."""
import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3

from catalog_manifest import BASELINE, load_export, utc_now

EXPORTS = Path(__file__).resolve().parent.parent / "exports"
DEFAULT_JSON_PATH = EXPORTS / "items.json"
DEFAULT_DB_PATH = EXPORTS / "eso_catalog.db"
COLUMNS = "game_item_id, name, category, subcategory, rarity, type, set_name, icon, metadata, icon_url"
UPSERT = f"""
    INSERT INTO items ({COLUMNS}) SELECT {COLUMNS} FROM incoming WHERE true
    ON CONFLICT(game_item_id) DO UPDATE SET
        name=excluded.name, category=excluded.category, subcategory=excluded.subcategory,
        rarity=excluded.rarity, type=excluded.type, set_name=excluded.set_name, icon=excluded.icon,
        metadata=excluded.metadata, icon_url=excluded.icon_url
"""


def catalog_row(item):
    meta = item["metadata"]
    return (item["game_item_id"], item["name"], item["category"], item["subcategory"], item["rarity"],
            item["item_type"], (meta.get("set") or {}).get("name"), item["icon_url"],
            json.dumps(meta, ensure_ascii=False, sort_keys=True, allow_nan=False), item["icon_url"])


def digest_rows(rows):
    digest = hashlib.sha256()
    for row in rows:
        encoded = json.dumps(row, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        digest.update((encoded + "\n").encode("utf-8"))
    return digest.hexdigest()


def setup_catalog(conn):
    conn.execute("""CREATE TABLE IF NOT EXISTS items (
        game_item_id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT, subcategory TEXT,
        rarity INTEGER DEFAULT 1, type TEXT, set_name TEXT, icon TEXT, metadata TEXT, icon_url TEXT
    )""")
    for field in ("name", "category", "subcategory", "set_name"):
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_items_{field} ON items({field})")
    conn.execute("""CREATE TABLE IF NOT EXISTS catalog_members (
        game_item_id INTEGER PRIMARY KEY REFERENCES items(game_item_id)
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS catalog_manifest (
        id INTEGER PRIMARY KEY CHECK (id = 1), manifest_version INTEGER NOT NULL,
        normalization_version INTEGER NOT NULL, source_url TEXT NOT NULL,
        retrieval_id TEXT NOT NULL, retrieved_at TEXT NOT NULL, imported_at TEXT NOT NULL,
        artifact_sha256 TEXT NOT NULL, catalog_sha256 TEXT NOT NULL, item_count INTEGER NOT NULL,
        category_counts TEXT NOT NULL, result TEXT NOT NULL CHECK (result = 'verified'),
        source_manifest_sha256 TEXT NOT NULL, source_manifest_json TEXT NOT NULL
    )""")
    conn.execute("""CREATE TABLE IF NOT EXISTS catalog_name_changes (
        source_manifest_sha256 TEXT NOT NULL, game_item_id INTEGER NOT NULL,
        prior_name TEXT, source_name TEXT NOT NULL, PRIMARY KEY(source_manifest_sha256, game_item_id)
    )""")


def populate_database(json_path=DEFAULT_JSON_PATH, db_path=DEFAULT_DB_PATH, *, manifest_path=None,
                      manifest_sha256=None):
    items, source, proof = load_export(json_path, manifest_path, manifest_sha256)
    items.sort(key=lambda item: item["game_item_id"])
    projection = digest_rows(catalog_row(item) for item in items)
    Path(db_path).resolve().parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(db_path, timeout=5)) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA synchronous = FULL")
        # Stage and validate the candidate before taking the application writer lock.
        conn.execute(f"CREATE TEMP TABLE incoming ({COLUMNS}, PRIMARY KEY(game_item_id))")
        conn.executemany("INSERT INTO incoming VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                         (catalog_row(item) for item in items))
        conn.commit()
        del items
        with conn:
            conn.execute("BEGIN IMMEDIATE")
            setup_catalog(conn)
            changed = conn.execute("""
                INSERT OR IGNORE INTO catalog_name_changes
                SELECT ?, old.game_item_id, old.name, incoming.name
                FROM incoming JOIN items old USING (game_item_id)
                WHERE old.name IS NOT incoming.name
            """, (manifest_sha256,)).rowcount
            conn.execute(UPSERT)
            conn.execute("DELETE FROM catalog_members")
            conn.execute("INSERT INTO catalog_members SELECT game_item_id FROM incoming")
            actual = digest_rows(conn.execute(f"""SELECT {COLUMNS} FROM items
                JOIN catalog_members USING (game_item_id) ORDER BY game_item_id"""))
            if actual != projection:
                raise ValueError("SQLite catalog differs from the verified source projection.")
            retained = conn.execute("""SELECT COUNT(*) FROM items
                WHERE game_item_id NOT IN (SELECT game_item_id FROM catalog_members)""").fetchone()[0]
            conn.execute("""INSERT INTO catalog_manifest
                (id, manifest_version, normalization_version, source_url, retrieval_id, retrieved_at,
                 imported_at, artifact_sha256, catalog_sha256, item_count, category_counts, result,
                 source_manifest_sha256, source_manifest_json)
                VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    manifest_version=excluded.manifest_version, normalization_version=excluded.normalization_version,
                    source_url=excluded.source_url, retrieval_id=excluded.retrieval_id,
                    retrieved_at=excluded.retrieved_at, imported_at=excluded.imported_at,
                    artifact_sha256=excluded.artifact_sha256, catalog_sha256=excluded.catalog_sha256,
                    item_count=excluded.item_count, category_counts=excluded.category_counts,
                    result=excluded.result, source_manifest_sha256=excluded.source_manifest_sha256,
                    source_manifest_json=excluded.source_manifest_json""",
                (source["manifest_version"], source["normalization_version"], source["source_url"],
                 source["retrieval_id"], source["retrieved_at"], utc_now(), source["artifact_sha256"],
                 projection, source["item_count"], json.dumps(source["category_counts"], sort_keys=True),
                 manifest_sha256, proof))
    print(json.dumps({"result": "verified", "source_manifest_sha256": manifest_sha256,
                      "catalog_sha256": projection, "verified_items": source["item_count"],
                      "delta_from_historical_baseline": source["item_count"] - BASELINE,
                      "source_ids_without_name": len(source["unnamed_item_ids"]),
                      "preserved_outside_manifest": retained, "name_changes_recorded": changed}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default=DEFAULT_JSON_PATH, help="Normalized UESP export.")
    parser.add_argument("--db", default=os.environ.get("DB_PATH") or DEFAULT_DB_PATH, help="SQLite database path.")
    parser.add_argument("--manifest", help="Acquisition manifest; defaults to the digest-named file beside the export.")
    parser.add_argument("--manifest-sha256", required=True, help="SHA-256 from the approved acquisition record.")
    args = parser.parse_args()
    populate_database(args.input, args.db, manifest_path=args.manifest, manifest_sha256=args.manifest_sha256)
