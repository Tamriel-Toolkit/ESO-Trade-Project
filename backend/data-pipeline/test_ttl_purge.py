import sqlite3
import os
import sys
import datetime

sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "exports", "eso_catalog.db"))

def test_ttl_purge():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Step 1: Ensure triggers and indexes exist
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON guild_trader_listings(expires_at);")
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS trg_purge_expired_listings_insert
        AFTER INSERT ON guild_trader_listings
        WHEN NEW.expires_at IS NOT NULL AND datetime(NEW.expires_at) < datetime('now')
        BEGIN
            DELETE FROM guild_trader_listings WHERE id = NEW.id;
        END;
    """)
    cursor.execute("""
        CREATE TRIGGER IF NOT EXISTS trg_purge_expired_listings_update
        AFTER UPDATE OF expires_at ON guild_trader_listings
        WHEN NEW.expires_at IS NOT NULL AND datetime(NEW.expires_at) < datetime('now')
        BEGIN
            DELETE FROM guild_trader_listings WHERE id = NEW.id;
        END;
    """)
    conn.commit()

    # Pick a valid game_item_id from items table
    cursor.execute("SELECT game_item_id FROM items LIMIT 1;")
    sample_item = cursor.fetchone()
    assert sample_item is not None, "No items found in items table!"
    item_id = sample_item[0]
    print(f"Using game_item_id: {item_id}")

    # Clean up test rows first if any exist
    cursor.execute("DELETE FROM guild_trader_listings WHERE guild_name = '__TEST_TTL_GUILD__';")
    conn.commit()

    now = datetime.datetime.now(datetime.timezone.utc)
    past_date = (now - datetime.timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
    future_date = (now + datetime.timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")

    print("\n--- Test 1: Insert Already-Expired Listing (Trigger Auto-Purge) ---")
    cursor.execute("""
        INSERT INTO guild_trader_listings 
        (game_item_id, server, seller_name, price, quantity, guild_name, location, expires_at)
        VALUES (?, 'NA', '@TestSellerExpired', 100, 1, '__TEST_TTL_GUILD__', 'Test Location', ?);
    """, (item_id, past_date))
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM guild_trader_listings WHERE guild_name = '__TEST_TTL_GUILD__' AND seller_name = '@TestSellerExpired';")
    count_expired = cursor.fetchone()[0]
    print(f"Expired listings found immediately after insert: {count_expired} (Expected: 0)")
    assert count_expired == 0, "Expected trigger to auto-purge already-expired listing on insert!"
    print("PASS: Insert trigger successfully purged expired listing.")

    print("\n--- Test 2: Insert Active Listing (Should Persist) ---")
    cursor.execute("""
        INSERT INTO guild_trader_listings 
        (game_item_id, server, seller_name, price, quantity, guild_name, location, expires_at)
        VALUES (?, 'NA', '@TestSellerActive', 500, 1, '__TEST_TTL_GUILD__', 'Test Location', ?);
    """, (item_id, future_date))
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM guild_trader_listings WHERE guild_name = '__TEST_TTL_GUILD__' AND seller_name = '@TestSellerActive';")
    count_active = cursor.fetchone()[0]
    print(f"Active listings found: {count_active} (Expected: 1)")
    assert count_active == 1, "Expected active listing to persist!"
    print("PASS: Active listing persisted as expected.")

    print("\n--- Test 3: Update Active Listing to Expired Date (Trigger Auto-Purge) ---")
    cursor.execute("""
        UPDATE guild_trader_listings 
        SET expires_at = ? 
        WHERE guild_name = '__TEST_TTL_GUILD__' AND seller_name = '@TestSellerActive';
    """, (past_date,))
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM guild_trader_listings WHERE guild_name = '__TEST_TTL_GUILD__' AND seller_name = '@TestSellerActive';")
    count_updated = cursor.fetchone()[0]
    print(f"Listings found after expiring via UPDATE: {count_updated} (Expected: 0)")
    assert count_updated == 0, "Expected update trigger to auto-purge expired listing on update!"
    print("PASS: Update trigger successfully purged expired listing.")

    # Cleanup
    cursor.execute("DELETE FROM guild_trader_listings WHERE guild_name = '__TEST_TTL_GUILD__';")
    conn.commit()
    conn.close()
    print("\nALL TTL PURGE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_ttl_purge()
