const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());
// Database connection
const dbPath = path.join(__dirname, "exports", "eso_catalog.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error connecting to the database:", err.message);
    } else {
        console.log("Connected to the SQLite database at:", dbPath);
        // Explicitly enable Foreign Key constraints
        db.run("PRAGMA foreign_keys = ON;", (fkErr) => {
            if (fkErr) {
                console.error("Error enabling SQLite foreign keys:", fkErr.message);
            } else {
                console.log("SQLite foreign key constraints enabled.");
            }
        });
        initializeDatabaseSchema();
    }
});

/**
 * Initialize characters and knowledge tables if they do not exist
 */
function initializeDatabaseSchema() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                class TEXT,
                level INTEGER,
                is_master_crafter INTEGER DEFAULT 0,
                last_sync_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `, (err) => {
            if (err) {
                console.error("Error creating 'characters' table:", err.message);
            } else {
                console.log("'characters' table initialized successfully.");
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS knowledge (
                character_id INTEGER,
                game_item_id INTEGER,
                is_known INTEGER DEFAULT 1,
                learned_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (character_id, game_item_id),
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) {
                console.error("Error creating 'knowledge' table:", err.message);
            } else {
                console.log("'knowledge' table initialized successfully.");
            }
        });

        db.run(`
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
        `, (err) => {
            if (err) {
                console.error("Error creating 'item_prices' table:", err.message);
            } else {
                console.log("'item_prices' table initialized successfully.");
            }
        });

        db.run(`
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
        `, (err) => {
            if (err) {
                console.error("Error creating 'guild_trader_listings' table:", err.message);
            } else {
                console.log("'guild_trader_listings' table initialized successfully.");
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS user_inventory (
                character_id INTEGER,
                game_item_id INTEGER,
                quantity INTEGER DEFAULT 1,
                PRIMARY KEY (character_id, game_item_id),
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) {
                console.error("Error creating 'user_inventory' table:", err.message);
            } else {
                console.log("'user_inventory' table initialized successfully.");
            }
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS watchlists (
                character_id INTEGER,
                game_item_id INTEGER,
                target_price INTEGER,
                is_notified INTEGER DEFAULT 0,
                PRIMARY KEY (character_id, game_item_id),
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) {
                console.error("Error creating 'watchlists' table:", err.message);
            } else {
                console.log("'watchlists' table initialized successfully.");
            }
        });

        // Indexes
        db.run("CREATE INDEX IF NOT EXISTS idx_listings_game_item_id ON guild_trader_listings(game_item_id);");
    });
}
/**
 * GET /api/taxonomy
 * Returns all unique categories and subcategories currently in the database
 * to build dynamic filters in the frontend.
 */
app.get("/api/taxonomy", (req, res) => {
    const query = "SELECT DISTINCT category, subcategory FROM items WHERE category IS NOT NULL ORDER BY category, subcategory;";
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const taxonomy = {};
        rows.forEach(row => {
            if (!taxonomy[row.category]) {
                taxonomy[row.category] = [];
            }
            if (row.subcategory && !taxonomy[row.category].includes(row.subcategory)) {
                taxonomy[row.category].push(row.subcategory);
            }
        });

        res.json(taxonomy);
    });
});

/**
 * GET /api/items
 * Fetches and filters items from the catalog database with pagination
 */
app.get("/api/items", (req, res) => {
    let { search, category, subcategory, rarity, limit, offset } = req.query;

    limit = Math.min(parseInt(limit, 10) || 20, 100); // default to 20, max 100
    offset = Math.max(parseInt(offset, 10) || 0, 0); // default to 0

    const conditions = [];
    const params = [];

    if (search) {
        conditions.push("name LIKE ?");
        params.push(`%${search}%`);
    }
    if (category) {
        conditions.push("category = ?");
        params.push(category);
    }
    if (subcategory) {
        conditions.push("subcategory = ?");
        params.push(subcategory);
    }
    if (rarity) {
        conditions.push("rarity = ?");
        params.push(parseInt(rarity, 10));
    }

    let countQuery = "SELECT COUNT(*) as total FROM items";
    let query = "SELECT * FROM items";

    if (conditions.length > 0) {
        const whereClause = " WHERE " + conditions.join(" AND ");
        countQuery += whereClause;
        query += whereClause;
    }

    query += " LIMIT ? OFFSET ?";
    const queryParams = [...params, limit, offset];

    // Count total matches for pagination indicators
    db.get(countQuery, params, (err, countResult) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const total = countResult ? countResult.total : 0;

        db.all(query, queryParams, (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Parse the metadata column string into JSON objects
            const items = rows.map(row => {
                try {
                    row.metadata = JSON.parse(row.metadata);
                } catch (e) {
                    row.metadata = {};
                }
                return row;
            });

            res.json({
                total,
                limit,
                offset,
                items
            });
        });
    });
});
/**
 * GET /api/items/:game_item_id
 * Returns detailed data for a specific item ID
 */
app.get("/api/items/:game_item_id", (req, res) => {
    const gameItemId = parseInt(req.params.game_item_id, 10);
    if (isNaN(gameItemId)) {
        return res.status(400).json({ error: "Invalid game_item_id" });
    }

    db.get("SELECT * FROM items WHERE game_item_id = ?", [gameItemId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Item not found" });
        }

        try {
            row.metadata = JSON.parse(row.metadata);
        } catch (e) {
            row.metadata = {};
        }

        res.json(row);
    });
});

// Promise helper functions for sqlite3 queries to support async/await
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
    });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

/**
 * GET /api/characters
 * Returns a list of all characters in the database
 */
app.get("/api/characters", async (req, res) => {
    try {
        const rows = await dbAll("SELECT id, name, class, level, is_master_crafter, last_sync_at FROM characters ORDER BY name;");
        // Convert is_master_crafter integer (0/1) to boolean
        const characters = rows.map(row => ({
            ...row,
            is_master_crafter: row.is_master_crafter === 1
        }));
        res.json(characters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/characters/sync
 * Syncs a character's details and their known items.
 * Performs an upsert on characters and syncs items in a transaction.
 */
app.post("/api/characters/sync", async (req, res) => {
    const { name, class: charClass, level, is_master_crafter, known_items } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Character name is required." });
    }

    try {
        // Begin immediate transaction to prevent concurrent modifications
        await dbRun("BEGIN IMMEDIATE TRANSACTION");

        // 1. Upsert character metadata
        await dbRun(`
            INSERT INTO characters (name, class, level, is_master_crafter, last_sync_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                class = excluded.class,
                level = excluded.level,
                is_master_crafter = excluded.is_master_crafter,
                last_sync_at = excluded.last_sync_at;
        `, [name, charClass || null, level ? parseInt(level, 10) : null, is_master_crafter ? 1 : 0]);

        // 2. Safely retrieve the character's primary key ID
        const charRow = await dbGet("SELECT id FROM characters WHERE name = ?", [name]);
        const characterId = charRow.id;

        // 3. Clear old knowledge mappings
        await dbRun("DELETE FROM knowledge WHERE character_id = ?", [characterId]);

        // 4. Bulk insert newly synchronized item IDs
        if (Array.isArray(known_items) && known_items.length > 0) {
            // SQLite has parameter bounds. We chunk the list of items to ensure safety.
            const chunkSize = 400; // 400 items * 2 parameters = 800 parameters, well within limit of 999
            for (let i = 0; i < known_items.length; i += chunkSize) {
                const chunk = known_items.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => "(?, ?, 1, CURRENT_TIMESTAMP)").join(", ");
                const sql = `INSERT INTO knowledge (character_id, game_item_id, is_known, learned_at) VALUES ${placeholders}`;
                
                const params = [];
                chunk.forEach(gameItemId => {
                    params.push(characterId, parseInt(gameItemId, 10));
                });
                
                await dbRun(sql, params);
            }
        }

        await dbRun("COMMIT");
        res.json({ success: true, character_id: characterId });
    } catch (err) {
        try {
            await dbRun("ROLLBACK");
        } catch (rollbackErr) {
            console.error("Rollback failed:", rollbackErr.message);
        }
        console.error("Error syncing character:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/character/:character_id
 * Returns all items associated with a specific character ID (SQL JOIN)
 */
app.get("/api/character/:character_id", async (req, res) => {
    const characterId = parseInt(req.params.character_id, 10);
    if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character_id" });
    }

    try {
        // 1. Verify character existence
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [characterId]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        // 2. Retrieve joined item metadata
        const query = `
            SELECT i.*, k.is_known, k.learned_at
            FROM items i
            JOIN knowledge k ON i.game_item_id = k.game_item_id
            WHERE k.character_id = ?
            ORDER BY i.name;
        `;
        const rows = await dbAll(query, [characterId]);

        // 3. Parse JSON metadata string into native JSON objects
        const items = rows.map(row => {
            try {
                row.metadata = JSON.parse(row.metadata);
            } catch (e) {
                row.metadata = {};
            }
            // Convert is_known integer to boolean
            row.is_known = row.is_known === 1;
            return row;
        });

        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/prices/sync
 * Batch upserts item prices. Runs in a transaction with chunked inserts.
 */
app.post("/api/prices/sync", async (req, res) => {
    const prices = req.body;
    if (!Array.isArray(prices)) {
        return res.status(400).json({ error: "Expected an array of price objects." });
    }

    try {
        await dbRun("BEGIN IMMEDIATE TRANSACTION");

        const chunkSize = 150; // 150 items * 6 parameters = 900 parameters
        for (let i = 0; i < prices.length; i += chunkSize) {
            const chunk = prices.slice(i, i + chunkSize);
            const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)").join(", ");
            const sql = `
                INSERT INTO item_prices (game_item_id, server, avg_price, min_price, max_price, suggested_price, last_updated)
                VALUES ${placeholders}
                ON CONFLICT(game_item_id, server) DO UPDATE SET
                    avg_price = excluded.avg_price,
                    min_price = excluded.min_price,
                    max_price = excluded.max_price,
                    suggested_price = excluded.suggested_price,
                    last_updated = excluded.last_updated;
            `;

            const params = [];
            chunk.forEach(item => {
                params.push(
                    parseInt(item.game_item_id, 10),
                    item.server || "NA",
                    item.avg_price ? parseInt(item.avg_price, 10) : null,
                    item.min_price ? parseInt(item.min_price, 10) : null,
                    item.max_price ? parseInt(item.max_price, 10) : null,
                    item.suggested_price ? parseInt(item.suggested_price, 10) : null
                );
            });

            await dbRun(sql, params);
        }

        await dbRun("COMMIT");
        res.json({ success: true, count: prices.length });
    } catch (err) {
        try {
            await dbRun("ROLLBACK");
        } catch (rollbackErr) {
            console.error("Rollback failed:", rollbackErr.message);
        }
        console.error("Error syncing prices:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/listings/sync
 * Batch upserts active guild trader listings (clear out-of-date listings first).
 */
app.post("/api/listings/sync", async (req, res) => {
    const { server, listings } = req.body;
    const targetServer = server || "NA";

    if (!Array.isArray(listings)) {
        return res.status(400).json({ error: "Expected 'listings' to be an array." });
    }

    try {
        await dbRun("BEGIN IMMEDIATE TRANSACTION");

        // 1. Clear out-of-date/expired listings first (expires_at < now)
        await dbRun("DELETE FROM guild_trader_listings WHERE datetime(expires_at) < datetime('now')");

        // 2. Insert new listings
        if (listings.length > 0) {
            const chunkSize = 100; // 100 items * 7 parameters = 700 parameters
            for (let i = 0; i < listings.length; i += chunkSize) {
                const chunk = listings.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)").join(", ");
                const sql = `
                    INSERT INTO guild_trader_listings (game_item_id, server, price, quantity, guild_name, location, expires_at, discovered_at)
                    VALUES ${placeholders};
                `;

                const params = [];
                chunk.forEach(item => {
                    params.push(
                        parseInt(item.game_item_id, 10),
                        targetServer,
                        parseInt(item.price, 10),
                        parseInt(item.quantity, 10) || 1,
                        item.guild_name || null,
                        item.location || null,
                        item.expires_at || null
                    );
                });

                await dbRun(sql, params);
            }
        }

        // 3. Clear out-of-date/expired listings again (to catch any incoming expired ones)
        await dbRun("DELETE FROM guild_trader_listings WHERE datetime(expires_at) < datetime('now')");

        await dbRun("COMMIT");
        res.json({ success: true, count: listings.length });
    } catch (err) {
        try {
            await dbRun("ROLLBACK");
        } catch (rollbackErr) {
            console.error("Rollback failed:", rollbackErr.message);
        }
        console.error("Error syncing listings:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/inventory/sync
 * Syncs a character's duplicates list from their in-game bags.
 */
app.post("/api/inventory/sync", async (req, res) => {
    const { character_id, inventory } = req.body;

    if (!character_id) {
        return res.status(400).json({ error: "character_id is required." });
    }
    if (!Array.isArray(inventory)) {
        return res.status(400).json({ error: "Expected 'inventory' to be an array." });
    }

    try {
        // Verify character existence first
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [character_id]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        await dbRun("BEGIN IMMEDIATE TRANSACTION");

        // 1. Clear existing inventory for this character
        await dbRun("DELETE FROM user_inventory WHERE character_id = ?", [character_id]);

        // 2. Insert new inventory items
        if (inventory.length > 0) {
            const chunkSize = 250; // 250 items * 3 parameters = 750 parameters
            for (let i = 0; i < inventory.length; i += chunkSize) {
                const chunk = inventory.slice(i, i + chunkSize);
                const placeholders = chunk.map(() => "(?, ?, ?)").join(", ");
                const sql = `
                    INSERT INTO user_inventory (character_id, game_item_id, quantity)
                    VALUES ${placeholders}
                    ON CONFLICT(character_id, game_item_id) DO UPDATE SET quantity = excluded.quantity;
                `;

                const params = [];
                chunk.forEach(item => {
                    params.push(
                        character_id,
                        parseInt(item.game_item_id, 10),
                        parseInt(item.quantity, 10) || 1
                    );
                });

                await dbRun(sql, params);
            }
        }

        await dbRun("COMMIT");
        res.json({ success: true, count: inventory.length });
    } catch (err) {
        try {
            await dbRun("ROLLBACK");
        } catch (rollbackErr) {
            console.error("Rollback failed:", rollbackErr.message);
        }
        console.error("Error syncing inventory:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/listings/personalized/:character_id
 * Returns active listings for items the specified character does NOT know.
 * Paginated via limit and offset. Sorted by highest value_index or lowest price.
 */
app.get("/api/listings/personalized/:character_id", async (req, res) => {
    const characterId = parseInt(req.params.character_id, 10);
    if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character_id" });
    }

    let { limit, offset, server } = req.query;
    limit = Math.min(parseInt(limit, 10) || 20, 100);
    offset = Math.max(parseInt(offset, 10) || 0, 0);
    const targetServer = server || "NA";

    try {
        // Verify character existence first
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [characterId]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        // Count total matches for pagination
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM guild_trader_listings gtl
            WHERE gtl.server = ? AND gtl.game_item_id NOT IN (
                SELECT game_item_id 
                FROM knowledge 
                WHERE character_id = ? AND is_known = 1
            );
        `;
        const countResult = await dbGet(countQuery, [targetServer, characterId]);
        const total = countResult ? countResult.total : 0;

        // Retrieve joined item listings
        const query = `
            SELECT 
                gtl.id AS listing_id,
                gtl.game_item_id,
                gtl.server,
                gtl.price,
                gtl.quantity,
                gtl.guild_name,
                gtl.location,
                gtl.expires_at,
                gtl.discovered_at,
                i.name AS item_name,
                i.icon_url AS item_icon,
                i.category AS item_category,
                i.subcategory AS item_subcategory,
                i.rarity AS item_rarity,
                i.metadata AS item_metadata,
                ip.suggested_price,
                ip.avg_price,
                CASE WHEN gtl.price > 0 THEN CAST(ip.suggested_price AS REAL) / gtl.price ELSE 0 END AS value_index
            FROM guild_trader_listings gtl
            JOIN items i ON gtl.game_item_id = i.game_item_id
            LEFT JOIN item_prices ip ON gtl.game_item_id = ip.game_item_id AND gtl.server = ip.server
            WHERE gtl.server = ? AND gtl.game_item_id NOT IN (
                SELECT game_item_id 
                FROM knowledge 
                WHERE character_id = ? AND is_known = 1
            )
            ORDER BY value_index DESC, gtl.price ASC
            LIMIT ? OFFSET ?;
        `;
        const rows = await dbAll(query, [targetServer, characterId, limit, offset]);

        const listings = rows.map(row => {
            try {
                row.item_metadata = JSON.parse(row.item_metadata);
            } catch (e) {
                row.item_metadata = {};
            }
            return row;
        });

        res.json({
            total,
            limit,
            offset,
            listings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/watchlist/:character_id
 * Get all watchlisted items for a character, along with current average pricing.
 */
app.get("/api/watchlist/:character_id", async (req, res) => {
    const characterId = parseInt(req.params.character_id, 10);
    if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character_id" });
    }

    try {
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [characterId]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        const query = `
            SELECT 
                w.game_item_id,
                w.target_price,
                w.is_notified,
                i.name AS item_name,
                i.icon_url AS item_icon,
                i.category AS item_category,
                i.subcategory AS item_subcategory,
                i.rarity AS item_rarity,
                i.metadata AS item_metadata,
                ip.avg_price,
                ip.suggested_price
            FROM watchlists w
            JOIN items i ON w.game_item_id = i.game_item_id
            LEFT JOIN item_prices ip ON w.game_item_id = ip.game_item_id
            WHERE w.character_id = ?;
        `;
        const rows = await dbAll(query, [characterId]);

        const watchlist = rows.map(row => {
            try {
                row.item_metadata = JSON.parse(row.item_metadata);
            } catch (e) {
                row.item_metadata = {};
            }
            row.is_notified = row.is_notified === 1;
            return row;
        });

        res.json(watchlist);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/watchlist
 * Add an item to the character's watchlist with a target_price.
 */
app.post("/api/watchlist", async (req, res) => {
    const { character_id, game_item_id, target_price } = req.body;

    if (!character_id || !game_item_id || target_price === undefined) {
        return res.status(400).json({ error: "character_id, game_item_id, and target_price are required." });
    }

    try {
        // Verify character exists
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [character_id]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        // Verify item exists
        const item = await dbGet("SELECT game_item_id FROM items WHERE game_item_id = ?", [game_item_id]);
        if (!item) {
            return res.status(404).json({ error: "Item not found in catalog" });
        }

        await dbRun(`
            INSERT INTO watchlists (character_id, game_item_id, target_price, is_notified)
            VALUES (?, ?, ?, 0)
            ON CONFLICT(character_id, game_item_id) DO UPDATE SET
                target_price = excluded.target_price,
                is_notified = 0;
        `, [character_id, game_item_id, parseInt(target_price, 10)]);

        res.json({ success: true, character_id, game_item_id, target_price });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/watchlist/:character_id/:game_item_id
 * Remove an item from a character's watchlist.
 */
app.delete("/api/watchlist/:character_id/:game_item_id", async (req, res) => {
    const characterId = parseInt(req.params.character_id, 10);
    const gameItemId = parseInt(req.params.game_item_id, 10);

    if (isNaN(characterId) || isNaN(gameItemId)) {
        return res.status(400).json({ error: "Invalid character_id or game_item_id" });
    }

    try {
        // Verify character exists
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [characterId]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        await dbRun("DELETE FROM watchlists WHERE character_id = ? AND game_item_id = ?", [characterId, gameItemId]);
        res.json({ success: true, message: "Item removed from watchlist" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/watchlist/:character_id/alerts
 * Compares the character's watchlist target prices with active listings and returns matches.
 */
app.get("/api/watchlist/:character_id/alerts", async (req, res) => {
    const characterId = parseInt(req.params.character_id, 10);
    if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character_id" });
    }

    try {
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [characterId]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        const query = `
            SELECT 
                w.game_item_id,
                w.target_price,
                gtl.id AS listing_id,
                gtl.server,
                gtl.price AS listed_price,
                gtl.quantity,
                gtl.guild_name,
                gtl.location,
                gtl.expires_at,
                i.name AS item_name,
                i.icon_url AS item_icon,
                i.category AS item_category,
                i.subcategory AS item_subcategory,
                i.rarity AS item_rarity
            FROM watchlists w
            JOIN guild_trader_listings gtl ON w.game_item_id = gtl.game_item_id
            JOIN items i ON w.game_item_id = i.game_item_id
            WHERE w.character_id = ? AND gtl.price <= w.target_price;
        `;
        const rows = await dbAll(query, [characterId]);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/trades/matches/:character_id
 * Cross-references this character's missing items (is_known = 0)
 * with duplicate items in user_inventory for other characters.
 */
app.get("/api/trades/matches/:character_id", async (req, res) => {
    const characterId = parseInt(req.params.character_id, 10);
    if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character_id" });
    }

    try {
        const character = await dbGet("SELECT id FROM characters WHERE id = ?", [characterId]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }

        const query = `
            SELECT 
                ui.character_id AS matching_character_id,
                c.name AS matching_character_name,
                ui.game_item_id,
                ui.quantity AS duplicate_quantity,
                i.name AS item_name,
                i.icon_url AS item_icon,
                i.category AS item_category,
                i.subcategory AS item_subcategory,
                i.rarity AS item_rarity,
                i.metadata AS item_metadata
            FROM knowledge k
            JOIN user_inventory ui ON k.game_item_id = ui.game_item_id
            JOIN characters c ON ui.character_id = c.id
            JOIN items i ON ui.game_item_id = i.game_item_id
            WHERE k.character_id = ? 
              AND k.is_known = 0
              AND ui.character_id != ?
            ORDER BY matching_character_name, i.name;
        `;
        const rows = await dbAll(query, [characterId, characterId]);

        const matches = rows.map(row => {
            try {
                row.item_metadata = JSON.parse(row.item_metadata);
            } catch (e) {
                row.item_metadata = {};
            }
            return row;
        });

        res.json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
