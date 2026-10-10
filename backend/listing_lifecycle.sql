-- Shared by the API and desktop importer. Statement markers avoid SQL splitting.
CREATE TABLE IF NOT EXISTS native_listing_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server TEXT NOT NULL,
    uid TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    game_item_id INTEGER NOT NULL REFERENCES items(game_item_id),
    item_name TEXT,
    seller_name TEXT NOT NULL,
    total_price INTEGER NOT NULL CHECK(total_price > 0),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    guild_name TEXT NOT NULL,
    location TEXT,
    level INTEGER NOT NULL,
    quality INTEGER NOT NULL,
    trait_id INTEGER NOT NULL,
    observed_at INTEGER NOT NULL,
    expires_at INTEGER,
    UNIQUE(server, uid)
);
-- @statement
CREATE INDEX IF NOT EXISTS idx_native_listing_market
ON native_listing_observations(server, game_item_id);
-- @statement
CREATE INDEX IF NOT EXISTS idx_native_listing_age ON native_listing_observations(observed_at);
-- @statement
CREATE INDEX IF NOT EXISTS idx_native_listing_expiry ON native_listing_observations(expires_at);
-- @statement
CREATE TABLE IF NOT EXISTS native_listing_tombstones (
    server TEXT NOT NULL,
    uid TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    purchased_at INTEGER NOT NULL,
    PRIMARY KEY(server, uid)
);
-- @statement
-- Identity-free migration markers, NOT listings. Old aggregate clients cannot
-- resurrect a group after individual UIDs have taken over or been purchased.
CREATE TABLE IF NOT EXISTS native_listing_groups (
    server TEXT NOT NULL, game_item_id INTEGER NOT NULL, guild_name TEXT NOT NULL,
    seller_name TEXT NOT NULL, total_price INTEGER NOT NULL, quantity INTEGER NOT NULL,
    level INTEGER NOT NULL, quality INTEGER NOT NULL, trait_id INTEGER NOT NULL,
    PRIMARY KEY(server, game_item_id, guild_name, seller_name, total_price, quantity, level, quality, trait_id)
);
-- @statement
CREATE VIEW IF NOT EXISTS guild_trader_active_listings AS
SELECT l.id, l.game_item_id, l.item_name, l.server, l.seller_name, l.price,
       l.total_price, l.quantity, l.active_stacks, l.guild_name, l.location,
       l.level, l.quality, l.trait_id, l.expires_at, l.discovered_at
FROM guild_trader_listings l
WHERE (l.expires_at IS NULL OR datetime(l.expires_at) > datetime('now'))
  AND datetime(l.discovered_at) >= datetime('now', '-30 days')
  AND NOT EXISTS (
      SELECT 1 FROM native_listing_groups g
      WHERE g.server = l.server AND g.game_item_id = l.game_item_id
        AND g.guild_name = l.guild_name AND g.seller_name = l.seller_name
        AND g.quantity = l.quantity AND g.level = l.level AND g.quality = l.quality
        AND (g.trait_id = l.trait_id OR l.trait_id = 0)
        AND (g.total_price = COALESCE(l.total_price, ROUND(l.price * l.quantity))
             OR ABS(g.total_price * 1.0 / g.quantity - l.price) <= 0.005)
  )
UNION ALL
SELECT -MIN(n.id), n.game_item_id, MAX(n.item_name), n.server, n.seller_name,
       n.total_price * 1.0 / n.quantity, n.total_price, n.quantity, COUNT(*),
       n.guild_name, MAX(n.location), n.level, n.quality, n.trait_id,
       datetime(MIN(n.expires_at), 'unixepoch'), datetime(MAX(n.observed_at), 'unixepoch')
FROM native_listing_observations n
WHERE n.observed_at >= CAST(strftime('%s', 'now') AS INTEGER) - 2592000
  AND (n.expires_at IS NULL OR n.expires_at > CAST(strftime('%s', 'now') AS INTEGER))
  AND NOT EXISTS (SELECT 1 FROM native_listing_tombstones t WHERE t.server = n.server AND t.uid = n.uid)
GROUP BY n.game_item_id, n.server, n.guild_id, n.guild_name, n.seller_name,
         n.total_price, n.quantity, n.level, n.quality, n.trait_id;
