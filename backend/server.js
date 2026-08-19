const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Process-Level Exception & Rejection Handlers
process.on("unhandledRejection", (reason, promise) => {
    console.error("[FATAL] Unhandled Promise Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("[FATAL] Uncaught Exception thrown:", err);
});

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { rateLimit } = require("express-rate-limit");
const sqlite3 = require("sqlite3").verbose();
const app = express();
const PORT = process.env.PORT || 5001;

// Developer & Testing Environment Flag (defaults to 'development' if NODE_ENV is unset)
const nodeEnv = process.env.NODE_ENV || "development";
const isDevMode = (nodeEnv === "development" || nodeEnv === "test" || process.env.ENABLE_DEV_ENDPOINTS === "true") && process.env.NODE_ENV !== "production";

// Auth Cookie Settings
const AUTH_COOKIE_NAME = "eso_trade_token";
const getAuthCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Security Headers Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Middleware
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server daemon)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || (isDevMode && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

// Rate Limiting Middleware
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: true,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many requests from this IP, please try again after a minute." }
});

const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 10, // 10 auth attempts per minute per IP
    standardHeaders: true,
    legacyHeaders: true,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many authentication attempts. Please try again after a minute." }
});

const batchUploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 10, // 10 batch uploads per minute per IP
    standardHeaders: true,
    legacyHeaders: true,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Too many batch upload requests. Please slow down." }
});

const scraperLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    limit: 5, // 5 extraction requests per 5 minutes per IP
    standardHeaders: true,
    legacyHeaders: true,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Scraper extraction rate limit exceeded. Please wait before triggering another live scan." }
});

let isScraperRunning = false;

app.use("/api/", generalLimiter);
app.use("/api/auth/", authLimiter);
// Database connection
const dbPath = process.env.DB_PATH || path.join(__dirname, "exports", "eso_catalog.db");
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
        `, (err) => {
            if (err) console.error("Error creating 'items' table:", err.message);
        });
        db.run("ALTER TABLE items ADD COLUMN set_name TEXT;", () => {});
        db.run("ALTER TABLE items ADD COLUMN type TEXT;", () => {});
        db.run("ALTER TABLE items ADD COLUMN icon TEXT;", () => {});
        db.run("CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);");
        db.run("CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);");
        db.run("CREATE INDEX IF NOT EXISTS idx_items_set_name ON items(set_name);");

        // Seed starter items (runs sequentially inside db.serialize before foreign keys reference items)
        db.run(`
            INSERT OR IGNORE INTO items (game_item_id, name, category, subcategory, rarity, type, set_name, icon, metadata, icon_url)
            VALUES 
                (1129, 'Werewolf Hide King Deleyn''s Longbow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
                (1321, 'Maple Bow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
                (1727, 'Brackenleaf''s Bough', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
                (2501, 'Ebony-Inlaid Longbow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
                (4317, 'Naryu''s Sniper''s Bow', 'Weapon', 'Bow', 5, 'Weapon', NULL, '/esoui/art/icons/gear_nord_bow_a.dds', '{"rarity": 5}', '/esoui/art/icons/gear_nord_bow_a.dds'),
                (68447, 'Briarheart Jack', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_chest_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_chest_a.dds'),
                (68448, 'Briarheart Boots', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_feet_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_feet_a.dds'),
                (68449, 'Briarheart Bracers', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_hands_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_hands_a.dds'),
                (68450, 'Briarheart Helmet', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_head_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_head_a.dds'),
                (68451, 'Briarheart Guards', 'Armor', 'Medium Armor', 4, 'Armor', 'Briarheart', '/esoui/art/icons/gear_reach_medium_legs_a.dds', '{"set": {"name": "Briarheart"}}', '/esoui/art/icons/gear_reach_medium_legs_a.dds'),
                (97218, 'Necklace of a Mother''s Sorrow', 'Armor', 'Jewelry', 4, 'Armor', 'Mother''s Sorrow', '/esoui/art/icons/gear_nord_necklace_a.dds', '{"set": {"name": "Mother''s Sorrow"}}', '/esoui/art/icons/gear_nord_necklace_a.dds'),
                (97227, 'Inferno Staff of a Mother''s Sorrow', 'Weapon', 'Destruction Staff', 5, 'Weapon', 'Mother''s Sorrow', '/esoui/art/icons/gear_nord_staff_inferno_a.dds', '{"set": {"name": "Mother''s Sorrow"}}', '/esoui/art/icons/gear_nord_staff_inferno_a.dds'),
                (97253, 'Robe of a Mother''s Sorrow', 'Armor', 'Light Armor', 5, 'Armor', 'Mother''s Sorrow', '/esoui/art/icons/gear_nord_light_robe_a.dds', '{"set": {"name": "Mother''s Sorrow"}}', '/esoui/art/icons/gear_nord_light_robe_a.dds'),
                (142765, 'Bright-Throat''s Boast Hat', 'Armor', 'Light Armor', 3, 'Armor', 'Bright-Throat''s Boast', '/esoui/art/icons/gear_nord_light_hat_a.dds', '{"set": {"name": "Bright-Throat''s Boast"}}', '/esoui/art/icons/gear_nord_light_hat_a.dds'),
                (150001, 'Recipe: Hearty Garlic Corn Chowder', 'Recipe', 'Provisioning', 2, 'Recipe', NULL, '/esoui/art/icons/crafting_provisioner_bowl_soup.dds', '{"rarity": 2}', '/esoui/art/icons/crafting_provisioner_bowl_soup.dds'),
                (150002, 'Alinor Gaming Table', 'Furnishing', 'Parlor', 3, 'Furnishing', NULL, '/esoui/art/icons/furnishing_table_a.dds', '{"rarity": 3}', '/esoui/art/icons/furnishing_table_a.dds'),
                (150003, 'Crown Tri-Restoration Potion', 'Consumable', 'Potion', 4, 'Consumable', NULL, '/esoui/art/icons/potion_tri_a.dds', '{"rarity": 4}', '/esoui/art/icons/potion_tri_a.dds'),
                (150004, 'Kutas Runestone', 'Other', 'Enchanting', 4, 'Crafting Material', NULL, '/esoui/art/icons/crafting_runestone_kuta.dds', '{"rarity": 4}', '/esoui/art/icons/crafting_runestone_kuta.dds');
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                eso_handle TEXT,
                api_token TEXT UNIQUE,
                role TEXT DEFAULT 'user',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `, (err) => {
            if (err) console.error("Error creating 'users' table:", err.message);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) console.error("Error creating 'sessions' table:", err.message);
        });

        db.run("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);");
        db.run("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);");

        if (isDevMode) {
            const seedBlakeToken = process.env.BLAKE_API_TOKEN || crypto.randomBytes(16).toString("hex");
            const seedDemoToken = process.env.DEMO_API_TOKEN || crypto.randomBytes(16).toString("hex");
            db.run(`
                INSERT INTO users (id, username, email, password_hash, eso_handle, api_token, role)
                VALUES 
                    (1, 'Blake', 'blake@esotrade.local', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', '@Blake', ?, 'admin'),
                    (2, 'Demo', 'demo@esotrade.local', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', '@Demo', ?, 'user')
                ON CONFLICT(id) DO UPDATE SET
                    username = excluded.username;
            `, [seedBlakeToken, seedDemoToken]);
        }


        db.run(`
            CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER DEFAULT 1,
                name TEXT UNIQUE NOT NULL,
                class TEXT,
                level INTEGER DEFAULT 50,
                alliance INTEGER DEFAULT 1,
                is_master_crafter INTEGER DEFAULT 0,
                master_crafter_unlocked INTEGER DEFAULT 0,
                last_sync_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `, (err) => {
            if (err) console.error("Error creating 'characters' table:", err.message);
            else console.log("'characters' table initialized successfully.");
        });

        db.run("ALTER TABLE characters ADD COLUMN user_id INTEGER DEFAULT 1;", () => {});
        db.run("ALTER TABLE characters ADD COLUMN alliance INTEGER DEFAULT 1;", () => {});
        db.run("ALTER TABLE characters ADD COLUMN master_crafter_unlocked INTEGER DEFAULT 0;", () => {});

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
            CREATE TABLE IF NOT EXISTS character_gear (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                character_id INTEGER NOT NULL,
                slot_id INTEGER NOT NULL,
                game_item_id INTEGER NOT NULL,
                item_name TEXT NOT NULL,
                item_link TEXT NOT NULL,
                quality INTEGER DEFAULT 1,
                trait_id INTEGER DEFAULT 0,
                set_name TEXT,
                enchantment_description TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
                UNIQUE(character_id, slot_id)
            );
        `, (err) => {
            db.run("ALTER TABLE character_gear ADD COLUMN item_icon TEXT", () => {});
            db.run("ALTER TABLE character_gear ADD COLUMN trait_name TEXT", () => {});
            db.run("ALTER TABLE character_gear ADD COLUMN trait_description TEXT", () => {});
            db.run("ALTER TABLE character_gear ADD COLUMN armor_rating INTEGER DEFAULT 0", () => {});
            db.run("ALTER TABLE character_gear ADD COLUMN weapon_power INTEGER DEFAULT 0", () => {});
            db.run("UPDATE items SET icon_url = REPLACE(icon_url, '.dds', '.png') WHERE icon_url LIKE '%.dds'", () => {});
            db.run("UPDATE character_gear SET item_icon = REPLACE(item_icon, '.dds', '.png') WHERE item_icon LIKE '%.dds'", () => {});
            console.log("'character_gear' table initialized successfully.");
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
                item_name TEXT,
                server TEXT,
                seller_name TEXT DEFAULT '@Unknown',
                price INTEGER,
                quantity INTEGER,
                active_stacks INTEGER DEFAULT 1,
                guild_name TEXT,
                location TEXT,
                level INTEGER DEFAULT 1,
                quality INTEGER DEFAULT 1,
                trait_id INTEGER DEFAULT 0,
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

        // Ensure item_name column exists for dynamic in-game item naming
        db.run(`ALTER TABLE guild_trader_listings ADD COLUMN item_name TEXT`, () => {});

        db.run(`
            CREATE TABLE IF NOT EXISTS user_inventory (
                character_id INTEGER NOT NULL,
                game_item_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                PRIMARY KEY (character_id, game_item_id),
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) console.error("Error creating 'user_inventory' table:", err.message);
            else console.log("'user_inventory' table initialized successfully.");
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS watchlists (
                character_id INTEGER NOT NULL,
                game_item_id INTEGER NOT NULL,
                target_price INTEGER NOT NULL,
                is_notified INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (character_id, game_item_id),
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY (game_item_id) REFERENCES items(game_item_id) ON DELETE CASCADE
            );
        `, (err) => {
            if (err) console.error("Error creating 'watchlists' table:", err.message);
            else console.log("'watchlists' table initialized successfully.");
        });

        // Seed starter prices & listings (for clean test/CI environments)
        db.run(`
            INSERT OR IGNORE INTO item_prices (game_item_id, server, avg_price, min_price, max_price, suggested_price)
            VALUES 
                (97218, 'NA', 130000, 100000, 150000, 130000),
                (97227, 'NA', 45000, 35000, 60000, 45000),
                (150001, 'NA', 36, 20, 50, 36);
        `);

        db.run(`
            INSERT OR IGNORE INTO guild_trader_listings (game_item_id, server, seller_name, price, quantity, active_stacks, guild_name, location, level, quality, trait_id)
            VALUES 
                (150001, 'NA', '@TraderJoe', 22, 1, 1, 'Scourge Alliance', 'Mournhold, Deshaan', 1, 2, 0),
                (97227, 'NA', '@MageGuildMaster', 42000, 1, 1, 'Tamriel Merchants', 'Elden Root, Grahtwood', 50, 5, 3);
        `);

        // Migration columns for existing databases
        db.run("ALTER TABLE guild_trader_listings ADD COLUMN seller_name TEXT DEFAULT '@Unknown';", (err) => {});
        db.run("ALTER TABLE guild_trader_listings ADD COLUMN active_stacks INTEGER DEFAULT 1;", (err) => {});
        db.run("ALTER TABLE guild_trader_listings ADD COLUMN level INTEGER DEFAULT 1;", (err) => {});
        db.run("ALTER TABLE guild_trader_listings ADD COLUMN quality INTEGER DEFAULT 1;", (err) => {});
        db.run("ALTER TABLE guild_trader_listings ADD COLUMN trait_id INTEGER DEFAULT 0;", (err) => {});

        // Drop old indexes and create robust seller compound unique index
        db.run("DROP INDEX IF EXISTS idx_unique_listing;");
        db.run(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_seller_listing 
            ON guild_trader_listings (game_item_id, server, guild_name, seller_name, price, quantity, level, quality, trait_id);
        `);
        db.run("CREATE INDEX IF NOT EXISTS idx_listings_game_item_id ON guild_trader_listings(game_item_id);");
        db.run("CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON guild_trader_listings(expires_at);");
        db.run("CREATE INDEX IF NOT EXISTS idx_listings_server_item ON guild_trader_listings(server, game_item_id);");
        db.run("CREATE INDEX IF NOT EXISTS idx_listings_server ON guild_trader_listings(server);");

        // SQLite triggers for automated expired listing TTL purging on insert & update
        db.run(`
            CREATE TRIGGER IF NOT EXISTS trg_purge_expired_listings_insert
            AFTER INSERT ON guild_trader_listings
            WHEN NEW.expires_at IS NOT NULL AND datetime(NEW.expires_at) < datetime('now')
            BEGIN
                DELETE FROM guild_trader_listings WHERE id = NEW.id;
            END;
        `);
        db.run(`
            CREATE TRIGGER IF NOT EXISTS trg_purge_expired_listings_update
            AFTER UPDATE OF expires_at ON guild_trader_listings
            WHEN NEW.expires_at IS NOT NULL AND datetime(NEW.expires_at) < datetime('now')
            BEGIN
                DELETE FROM guild_trader_listings WHERE id = NEW.id;
            END;
        `);
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
 * Purges expired guild trader listings from the database.
 */
async function purgeExpiredListings() {
    try {
        const result = await dbRun("DELETE FROM guild_trader_listings WHERE expires_at IS NOT NULL AND datetime(expires_at) < datetime('now')");
        if (result && result.changes > 0) {
            console.log(`[TTL Purge] Purged ${result.changes} expired guild trader listings.`);
        }
        return result ? result.changes : 0;
    } catch (err) {
        console.error("[TTL Purge Error] Failed to purge expired listings:", err.message);
        return 0;
    }
}

// Background automated periodic TTL purge every hour (3,600,000 ms)
const TTL_PURGE_INTERVAL_MS = 60 * 60 * 1000;
setInterval(purgeExpiredListings, TTL_PURGE_INTERVAL_MS);
setTimeout(purgeExpiredListings, 2000);

/**
 * GET /api/status
 * Returns system health, active listings counts, and latest watcher scan timestamps
 */
app.get("/api/status", async (req, res) => {
    try {
        const listingRow = await dbGet("SELECT COUNT(*) as count, MAX(discovered_at) as latest_scan FROM guild_trader_listings");
        const priceRow = await dbGet("SELECT COUNT(*) as count FROM item_prices");
        const charRow = await dbGet("SELECT MAX(last_sync_at) as latest_char_sync FROM characters");
        
        res.json({
            success: true,
            status: "online",
            active_listings: listingRow ? listingRow.count : 0,
            catalog_prices: priceRow ? priceRow.count : 0,
            latest_scan_at: listingRow?.latest_scan || charRow?.latest_char_sync || null
        });
    } catch (err) {
        res.status(500).json({ success: false, status: "offline", error: err.message });
    }
});

/**
 * GET /api/characters
 * Returns a list of all characters in the database
 */
app.get("/api/characters", async (req, res) => {
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.json({ success: true, characters: [] });
    }
    try {
        const characters = await dbAll(`
            SELECT id, user_id, name, class, level, master_crafter_unlocked, alliance, last_sync_at
            FROM characters
            WHERE user_id = ?
            ORDER BY level DESC, name ASC;
        `, [userId]);
        res.json({ success: true, characters });
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
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to sync character data." });
    }

    const { name, class: charClass, level, is_master_crafter, known_items } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Character name is required." });
    }

    try {
        const existingChar = await dbGet("SELECT id, user_id FROM characters WHERE name = ?", [name]);
        if (existingChar && existingChar.user_id && existingChar.user_id !== userId) {
            return res.status(403).json({ error: "Forbidden: Character belongs to another user." });
        }

        // Begin immediate transaction to prevent concurrent modifications
        await dbRun("BEGIN IMMEDIATE TRANSACTION");

        // 1. Upsert character metadata
        await dbRun(`
            INSERT INTO characters (name, class, level, is_master_crafter, user_id, last_sync_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                class = excluded.class,
                level = excluded.level,
                is_master_crafter = excluded.is_master_crafter,
                user_id = COALESCE(characters.user_id, excluded.user_id),
                last_sync_at = excluded.last_sync_at;
        `, [name, charClass || null, level ? parseInt(level, 10) : null, is_master_crafter ? 1 : 0, userId]);

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
 * GET /api/characters/:id/profile
 * Returns character details, stats, equipped gear list by slot ID, and aggregated set/trait summaries.
 */
app.get("/api/characters/:id/profile", async (req, res) => {
    const { id } = req.params;
    try {
        const character = await dbGet(`
            SELECT id, user_id, name, class, level, master_crafter_unlocked, alliance, last_sync_at
            FROM characters
            WHERE id = ?;
        `, [id]);

        if (!character) {
            return res.status(404).json({ error: "Character profile not found." });
        }

        const gearRows = await dbAll(`
            SELECT cg.slot_id, cg.game_item_id, cg.item_name, cg.item_link, cg.quality, cg.trait_id, 
                   cg.trait_name, cg.trait_description, cg.armor_rating, cg.weapon_power,
                   cg.set_name, cg.enchantment_description, cg.updated_at,
                   REPLACE(COALESCE(cg.item_icon, i.icon_url), '.dds', '.png') AS item_icon, i.category AS item_category, i.subcategory AS item_subcategory,
                   i.rarity AS item_rarity, i.metadata AS item_metadata
            FROM character_gear cg
            LEFT JOIN items i ON cg.game_item_id = i.game_item_id
            WHERE cg.character_id = ?
            ORDER BY cg.slot_id ASC;
        `, [id]);

        const gearBySlot = {};
        gearRows.forEach(row => {
            try {
                row.item_metadata = row.item_metadata ? JSON.parse(row.item_metadata) : {};
            } catch (e) {
                row.item_metadata = {};
            }
            gearBySlot[row.slot_id] = row;
        });

        // Compute set bonus aggregates directly in SQL or memory
        const setCounts = {};
        const traitCounts = {};
        gearRows.forEach(g => {
            if (g.set_name) {
                setCounts[g.set_name] = (setCounts[g.set_name] || 0) + 1;
            }
            if (g.trait_name && g.trait_name !== "None" && g.trait_name !== "0") {
                traitCounts[g.trait_name] = (traitCounts[g.trait_name] || 0) + 1;
            }
        });

        res.json({
            success: true,
            character,
            gear: gearBySlot,
            active_sets: setCounts,
            active_traits: traitCounts
        });
    } catch (err) {
        console.error("Error fetching character profile:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/characters/upload-gear
 * Receives JSON loadout payload containing BAG_WORN slots [0-13] and updates character_gear table.
 */
app.post("/api/characters/upload-gear", batchUploadLimiter, async (req, res) => {
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to upload character gear." });
    }

    const { character_name, gear } = req.body;
    if (!character_name || !Array.isArray(gear)) {
        return res.status(400).json({ error: "character_name and gear array are required." });
    }

    try {
        let charRow = await dbGet("SELECT id, user_id FROM characters WHERE name = ?", [character_name]);
        if (charRow) {
            if (charRow.user_id && charRow.user_id !== userId) {
                return res.status(403).json({ error: "Forbidden: You do not have permission to modify gear for this character." });
            }
        } else {
            await dbRun(`
                INSERT INTO characters (name, class, level, is_master_crafter, user_id, last_sync_at)
                VALUES (?, 'Dragonknight', 50, 0, ?, CURRENT_TIMESTAMP)
            `, [character_name, userId]);
            charRow = await dbGet("SELECT id, user_id FROM characters WHERE name = ?", [character_name]);
        }

        const characterId = charRow.id;

        await dbRun("BEGIN IMMEDIATE TRANSACTION");
        for (const item of gear) {
            const { slot_id, game_item_id, item_name, item_link, quality, trait_id, set_name, enchantment_description, item_icon, trait_name, trait_description, armor_rating, weapon_power } = item;
            
            let normalizedIcon = item_icon ? item_icon.replace(/\.dds$/i, '.png') : null;
            if (normalizedIcon && (normalizedIcon.startsWith('/esoui/') || normalizedIcon.startsWith('esoui/'))) {
                normalizedIcon = `https://esoicons.uesp.net${normalizedIcon.startsWith('/') ? '' : '/'}${normalizedIcon}`;
            }

            await dbRun(`
                INSERT INTO character_gear (
                    character_id, slot_id, game_item_id, item_name, item_link, quality, trait_id, set_name, enchantment_description, item_icon, trait_name, trait_description, armor_rating, weapon_power, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(character_id, slot_id) DO UPDATE SET
                    game_item_id = excluded.game_item_id,
                    item_name = excluded.item_name,
                    item_link = excluded.item_link,
                    quality = excluded.quality,
                    trait_id = excluded.trait_id,
                    set_name = excluded.set_name,
                    enchantment_description = excluded.enchantment_description,
                    item_icon = excluded.item_icon,
                    trait_name = excluded.trait_name,
                    trait_description = excluded.trait_description,
                    armor_rating = excluded.armor_rating,
                    weapon_power = excluded.weapon_power,
                    updated_at = excluded.updated_at;
            `, [
                characterId,
                slot_id,
                game_item_id || 0,
                item_name || 'Unknown Item',
                item_link || '',
                quality || 1,
                trait_id || 0,
                set_name || null,
                enchantment_description || null,
                normalizedIcon,
                trait_name || null,
                trait_description || null,
                armor_rating || 0,
                weapon_power || 0
            ]);
        }
        await dbRun("COMMIT");

        res.json({ success: true, character_id: characterId, slots_updated: gear.length });
    } catch (err) {
        try { await dbRun("ROLLBACK"); } catch (rErr) {}
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
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to sync market prices." });
    }

    const prices = req.body;
    if (!Array.isArray(prices)) {
        return res.status(400).json({ error: "Expected an array of price objects." });
    }
    if (prices.length > 2000) {
        return res.status(400).json({ error: "Batch size exceeds maximum limit of 2,000 price records per request." });
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
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to sync guild trader listings." });
    }

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
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to sync inventory." });
    }

    const { character_id, inventory } = req.body;

    if (!character_id) {
        return res.status(400).json({ error: "character_id is required." });
    }
    if (!Array.isArray(inventory)) {
        return res.status(400).json({ error: "Expected 'inventory' to be an array." });
    }

    try {
        // Verify character existence and ownership
        const character = await dbGet("SELECT id, user_id FROM characters WHERE id = ?", [character_id]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }
        if (character.user_id && character.user_id !== userId) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to sync inventory for this character." });
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
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to modify watchlist." });
    }

    const { character_id, game_item_id, target_price } = req.body;

    if (!character_id || !game_item_id || target_price === undefined) {
        return res.status(400).json({ error: "character_id, game_item_id, and target_price are required." });
    }

    const parsedTargetPrice = parseInt(target_price, 10);
    if (isNaN(parsedTargetPrice) || parsedTargetPrice <= 0) {
        return res.status(400).json({ error: "Target price must be a positive number greater than zero." });
    }

    try {
        // Verify character exists and ownership
        const character = await dbGet("SELECT id, user_id FROM characters WHERE id = ?", [character_id]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }
        if (character.user_id && character.user_id !== userId) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to modify this character's watchlist." });
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
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to delete watchlist items." });
    }

    const characterId = parseInt(req.params.character_id, 10);
    const gameItemId = parseInt(req.params.game_item_id, 10);

    if (isNaN(characterId) || isNaN(gameItemId)) {
        return res.status(400).json({ error: "Invalid character_id or game_item_id" });
    }

    try {
        // Verify character exists and ownership
        const character = await dbGet("SELECT id, user_id FROM characters WHERE id = ?", [characterId]);
        if (!character) {
            return res.status(404).json({ error: "Character not found" });
        }
        if (character.user_id && character.user_id !== userId) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to modify this character's watchlist." });
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

/**
 * GET /api/market/prices
 * Query market prices joined with item metadata.
 * Supports filtering by search, category, subcategory, server, min/max price.
 */
app.get("/api/market/prices", async (req, res) => {
    let { search, category, subcategory, rarity, server, min_price, max_price, limit, offset, sort } = req.query;

    limit = Math.min(parseInt(limit, 10) || 20, 100);
    offset = Math.max(parseInt(offset, 10) || 0, 0);
    const targetServer = server || "NA";

    const conditions = ["ip.server = ?"];
    const params = [targetServer];

    if (search) {
        conditions.push("i.name LIKE ?");
        params.push(`%${search}%`);
    }
    if (category) {
        conditions.push("i.category = ?");
        params.push(category);
    }
    if (subcategory) {
        conditions.push("i.subcategory = ?");
        params.push(subcategory);
    }
    if (rarity) {
        conditions.push("i.rarity = ?");
        params.push(parseInt(rarity, 10));
    }
    if (min_price) {
        conditions.push("ip.suggested_price >= ?");
        params.push(parseInt(min_price, 10));
    }
    if (max_price) {
        conditions.push("ip.suggested_price <= ?");
        params.push(parseInt(max_price, 10));
    }

    const whereClause = " WHERE " + conditions.join(" AND ");
    
    let orderBy = "ORDER BY ip.suggested_price DESC";
    if (sort === "rarity_desc") orderBy = "ORDER BY i.rarity DESC, ip.suggested_price DESC";
    if (sort === "rarity_asc") orderBy = "ORDER BY i.rarity ASC, ip.suggested_price ASC";
    if (sort === "price_asc") orderBy = "ORDER BY ip.suggested_price ASC";
    if (sort === "name_asc") orderBy = "ORDER BY i.name ASC";
    if (sort === "avg_price_desc") orderBy = "ORDER BY ip.avg_price DESC";

    try {
        const countQuery = `
            SELECT COUNT(*) as total
            FROM item_prices ip
            JOIN items i ON ip.game_item_id = i.game_item_id
            ${whereClause}
        `;
        const countResult = await dbGet(countQuery, params);
        const total = countResult ? countResult.total : 0;

        const query = `
            SELECT 
                ip.game_item_id,
                ip.server,
                ip.avg_price,
                ip.min_price,
                ip.max_price,
                ip.suggested_price,
                ip.last_updated,
                i.name AS item_name,
                i.icon_url AS item_icon,
                i.category AS item_category,
                i.subcategory AS item_subcategory,
                i.rarity AS item_rarity,
                i.metadata AS item_metadata,
                gtl.guild_name,
                gtl.location,
                gtl.price,
                gtl.quantity
            FROM item_prices ip
            JOIN items i ON ip.game_item_id = i.game_item_id
            LEFT JOIN (
                SELECT game_item_id, server, guild_name, location, price, quantity,
                       ROW_NUMBER() OVER(PARTITION BY game_item_id, server ORDER BY discovered_at DESC) as rn
                FROM guild_trader_listings
            ) gtl ON ip.game_item_id = gtl.game_item_id AND ip.server = gtl.server AND gtl.rn = 1
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?;
        `;
        const rows = await dbAll(query, [...params, limit, offset]);

        const items = rows.map(row => {
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
            server: targetServer,
            items
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/market/listings
 * Query active guild trader listings joined with item metadata and suggested prices.
 * Calculates value_index (suggested_price / price).
 */
app.get("/api/market/listings", async (req, res) => {
    let { search, category, subcategory, rarity, location, server, min_price, max_price, min_value_index, hide_stale, max_age, limit, offset, sort } = req.query;

    limit = Math.min(parseInt(limit, 10) || 20, 100);
    offset = Math.max(parseInt(offset, 10) || 0, 0);
    const targetServer = server || "NA";

    const conditions = ["gtl.server = ?"];
    const params = [targetServer];

    if (search) {
        conditions.push("(i.name LIKE ? OR gtl.item_name LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
        conditions.push("i.category = ?");
        params.push(category);
    }
    if (subcategory) {
        conditions.push("i.subcategory = ?");
        params.push(subcategory);
    }
    if (rarity) {
        conditions.push("COALESCE(gtl.quality, i.rarity) = ?");
        params.push(parseInt(rarity, 10));
    }
    if (location) {
        conditions.push("gtl.location LIKE ?");
        params.push(`%${location}%`);
    }
    if (min_price) {
        conditions.push("gtl.price >= ?");
        params.push(parseInt(min_price, 10));
    }
    if (max_price) {
        conditions.push("gtl.price <= ?");
        params.push(parseInt(max_price, 10));
    }
    if (min_value_index) {
        conditions.push("(CASE WHEN gtl.price > 0 THEN CAST(ip.suggested_price AS REAL) / gtl.price ELSE 0 END) >= ?");
        params.push(parseFloat(min_value_index));
    }
    if (max_age) {
        const ageDays = parseInt(max_age, 10);
        if (!isNaN(ageDays) && ageDays > 0) {
            conditions.push(`datetime(gtl.discovered_at) >= datetime('now', '-${ageDays} days')`);
        }
    } else if (hide_stale === "true" || hide_stale === "1" || hide_stale === true) {
        conditions.push("datetime(gtl.discovered_at) >= datetime('now', '-7 days')");
    }

    const whereClause = " WHERE " + conditions.join(" AND ");

    let orderBy = "ORDER BY value_index DESC, gtl.price ASC";
    if (sort === "rarity_desc") orderBy = "ORDER BY item_rarity DESC, value_index DESC";
    if (sort === "rarity_asc") orderBy = "ORDER BY item_rarity ASC, value_index DESC";
    if (sort === "price_asc") orderBy = "ORDER BY gtl.price ASC";
    if (sort === "price_desc") orderBy = "ORDER BY gtl.price DESC";
    if (sort === "newest") orderBy = "ORDER BY gtl.discovered_at DESC";

    try {
        const countQuery = `
            SELECT COUNT(*) as total
            FROM guild_trader_listings gtl
            JOIN items i ON gtl.game_item_id = i.game_item_id
            LEFT JOIN item_prices ip ON gtl.game_item_id = ip.game_item_id AND gtl.server = ip.server
            ${whereClause}
        `;
        const countResult = await dbGet(countQuery, params);
        const total = countResult ? countResult.total : 0;

        const query = `
            SELECT 
                gtl.id AS listing_id,
                gtl.game_item_id,
                gtl.server,
                gtl.seller_name,
                gtl.price,
                gtl.quantity,
                gtl.active_stacks,
                gtl.guild_name,
                gtl.location,
                gtl.level,
                gtl.quality,
                gtl.trait_id,
                gtl.expires_at,
                gtl.discovered_at,
                COALESCE(gtl.item_name, i.name) AS item_name,
                i.icon_url AS item_icon,
                i.category AS item_category,
                i.subcategory AS item_subcategory,
                COALESCE(gtl.quality, i.rarity, 1) AS item_rarity,
                i.metadata AS item_metadata,
                ip.suggested_price,
                ip.avg_price,
                CASE WHEN gtl.price > 0 AND ip.suggested_price > 0 THEN CAST(ip.suggested_price AS REAL) / gtl.price ELSE 0 END AS value_index
            FROM guild_trader_listings gtl
            JOIN items i ON gtl.game_item_id = i.game_item_id
            LEFT JOIN item_prices ip ON gtl.game_item_id = ip.game_item_id AND gtl.server = ip.server
            ${whereClause}
            ${orderBy}
            LIMIT ? OFFSET ?;
        `;
        const rows = await dbAll(query, [...params, limit, offset]);

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
            server: targetServer,
            listings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/market/listings/extract
 * Triggers live extraction for a requested item name from TTC web portal.
 */
app.post("/api/market/listings/extract", scraperLimiter, async (req, res) => {
    const { search, server } = req.body;
    if (!search || typeof search !== "string" || search.trim().length === 0) {
        return res.status(400).json({ error: "search parameter is required." });
    }

    if (isScraperRunning) {
        return res.status(409).json({
            error: "A live market extraction job is already in progress. Please wait for it to complete.",
            success: false
        });
    }

    isScraperRunning = true;
    const targetServer = server || "NA";
    const { spawn } = require("child_process");
    let hasResponded = false;

    try {
        const pyScript = path.join(__dirname, "data-pipeline", "live_trader_extractor.py");
        const pyProcess = spawn("python", [pyScript, "--limit", "5"], {
            env: process.env
        });

        pyProcess.on("error", (err) => {
            isScraperRunning = false;
            console.error(`[Scraper Error]: Failed to spawn child process: ${err.message}`);
            if (!hasResponded) {
                hasResponded = true;
                res.status(500).json({
                    error: `Failed to execute scraper process: ${err.message}`,
                    success: false
                });
            }
        });

        pyProcess.on("close", async (code) => {
            isScraperRunning = false;
            if (hasResponded) return;
            hasResponded = true;

            console.log(`Live extraction process finished with code ${code}`);
            try {
                const query = `
                    SELECT 
                        gtl.id AS listing_id, gtl.game_item_id, gtl.server, gtl.price, gtl.quantity,
                        gtl.guild_name, gtl.location, gtl.expires_at, gtl.discovered_at,
                        COALESCE(gtl.item_name, i.name) AS item_name, i.icon_url AS item_icon, i.category AS item_category,
                        i.subcategory AS item_subcategory, COALESCE(gtl.quality, i.rarity, 1) AS item_rarity, i.metadata AS item_metadata,
                        ip.suggested_price, ip.avg_price,
                        CASE WHEN gtl.price > 0 THEN CAST(ip.suggested_price AS REAL) / gtl.price ELSE 0 END AS value_index
                    FROM guild_trader_listings gtl
                    JOIN items i ON gtl.game_item_id = i.game_item_id
                    LEFT JOIN item_prices ip ON gtl.game_item_id = ip.game_item_id AND gtl.server = ip.server
                    WHERE gtl.server = ? AND (i.name LIKE ? OR gtl.item_name LIKE ?)
                    ORDER BY value_index DESC, gtl.price ASC;
                `;
                const rows = await dbAll(query, [targetServer, `%${search}%`, `%${search}%`]);
                const listings = rows.map(r => {
                    try { r.item_metadata = JSON.parse(r.item_metadata); } catch(e) { r.item_metadata = {}; }
                    return r;
                });
                res.json({ success: true, count: listings.length, listings });
            } catch (queryErr) {
                res.status(500).json({ error: queryErr.message });
            }
        });
    } catch (err) {
        isScraperRunning = false;
        if (!hasResponded) {
            hasResponded = true;
            res.status(500).json({ error: err.message });
        }
    }
});

/**
 * POST /api/market/upload-scans
 * Crowdsourced scanner ingestion endpoint.
 * Accepts raw SavedVariables file content or JSON listings array from User A's client,
 * ingests into central database, making them instantly visible to User B on the web app.
 */
app.post("/api/market/upload-scans", batchUploadLimiter, async (req, res) => {
    const { server, listings, player_name, player_class, player_level, player_alliance, master_crafter } = req.body;
    const targetServer = server || "NA";

    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to upload market scans." });
    }

    if (!Array.isArray(listings) || listings.length === 0) {
        return res.status(400).json({ error: "Invalid listings array." });
    }

    if (listings.length > 2000) {
        return res.status(400).json({ error: "Batch size exceeds maximum limit of 2,000 listings per request." });
    }

    try {

        // AUTOMATED CHARACTER AUTO-DISCOVERY: Upsert scanner character into account roster
        if (player_name) {
            await dbRun(`
                INSERT INTO characters (user_id, name, class, level, alliance, master_crafter_unlocked, last_sync_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(name) DO UPDATE SET
                    user_id = excluded.user_id,
                    class = COALESCE(excluded.class, class),
                    level = COALESCE(excluded.level, level),
                    alliance = COALESCE(excluded.alliance, alliance),
                    master_crafter_unlocked = excluded.master_crafter_unlocked,
                    last_sync_at = CURRENT_TIMESTAMP;
            `, [userId, player_name, player_class || "Dragonknight", player_level || 50, player_alliance || 1, master_crafter || 0]);
        }

        let insertedCount = 0;
        const affectedItemIds = new Set();
        const scannedGuilds = new Set();
        const batchStartTime = new Date().toISOString().replace('T', ' ').substring(0, 19);

        for (const item of listings) {
            const { game_item_id, item_name, name, price, quantity, active_stacks, seller_name, guild_name, location, level, quality, trait_id, expires_at } = item;
            const displayName = item_name || name || null;
            if (game_item_id && price && guild_name) {
                const stackQty = Math.max(1, parseInt(quantity, 10) || 1);
                const stacksCount = Math.max(1, parseInt(active_stacks, 10) || 1);
                const unitPrice = Math.max(1, parseInt(price, 10) || 1);
                const sellerHandle = seller_name || "@Unknown";

                await dbRun(`
                    INSERT INTO guild_trader_listings 
                    (game_item_id, item_name, server, seller_name, price, quantity, active_stacks, guild_name, location, level, quality, trait_id, expires_at, discovered_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(game_item_id, server, guild_name, seller_name, price, quantity, level, quality, trait_id) DO UPDATE SET
                        item_name = COALESCE(excluded.item_name, item_name),
                        active_stacks = excluded.active_stacks,
                        discovered_at = CURRENT_TIMESTAMP,
                        location = CASE WHEN excluded.location != 'Tamriel Trader Kiosk' AND excluded.location != 'Guild Trader' THEN excluded.location ELSE location END,
                        expires_at = COALESCE(excluded.expires_at, expires_at);
                `, [game_item_id, displayName, targetServer, sellerHandle, unitPrice, stackQty, stacksCount, guild_name, location || "Guild Trader", level || 1, quality || 1, trait_id || 0, expires_at || null]);
                insertedCount++;
                affectedItemIds.add(game_item_id);
                scannedGuilds.add(guild_name);
            }
        }

        // Full Kiosk Reconciliation: Mark items as sold/removed if not refreshed in this kiosk scan batch
        if (scannedGuilds.size > 0) {
            for (const gName of scannedGuilds) {
                await dbRun(`
                    DELETE FROM guild_trader_listings
                    WHERE guild_name = ? AND server = ? AND discovered_at < ?;
                `, [gName, targetServer, batchStartTime]);
            }
        }

        // Continuously recalculate real-time market prices for affected items with trimmed outlier filtering
        if (affectedItemIds.size > 0) {
            for (const itemId of affectedItemIds) {
                const rows = await dbAll(`
                    SELECT price
                    FROM guild_trader_listings
                    WHERE game_item_id = ? AND server = ? AND price > 0
                    ORDER BY price ASC;
                `, [itemId, targetServer]);

                if (rows && rows.length > 0) {
                    const prices = rows.map(r => r.price);
                    const minPrice = prices[0];
                    const maxPrice = prices[prices.length - 1];
                    
                    // Filter out listings > 3.5x min (or 100g cutoff) to strip outlier joke listings
                    const validPrices = prices.filter(p => p <= Math.max(minPrice * 3.5, 100));
                    const trimmedAvg = Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length);

                    await dbRun(`
                        INSERT INTO item_prices (game_item_id, server, min_price, max_price, avg_price, suggested_price, last_updated)
                        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(game_item_id, server) DO UPDATE SET
                            min_price = excluded.min_price,
                            max_price = excluded.max_price,
                            avg_price = excluded.avg_price,
                            suggested_price = excluded.suggested_price,
                            last_updated = CURRENT_TIMESTAMP;
                    `, [itemId, targetServer, minPrice, maxPrice, trimmedAvg, trimmedAvg]);
                }
            }
        }

        res.json({
            success: true,
            message: `Successfully ingested ${insertedCount} crowdsourced listings & recalculated dynamic prices for ${affectedItemIds.size} items!`,
            count: insertedCount,
            recalculated_items: affectedItemIds.size
        });
    } catch (err) {
        console.error("Error in upload-scans:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/market/listings/purge-expired
 * Manually trigger an immediate TTL purge of expired guild trader listings.
 */
app.post("/api/market/listings/purge-expired", async (req, res) => {
    try {
        const purgedCount = await purgeExpiredListings();
        res.json({
            success: true,
            purged: purgedCount,
            message: `Successfully purged ${purgedCount} expired listing(s).`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start server
if (isDevMode) {
    /**
     * POST /api/market/dev/clear-listings
     * Dev endpoint to clear all listings and item prices from database (strictly requires admin authorization).
     */
    app.post("/api/market/dev/clear-listings", async (req, res) => {
        const authUserId = await getAuthUserId(req);
        const authUser = authUserId ? await dbGet("SELECT role FROM users WHERE id = ?", [authUserId]) : null;
        if (!authUser || authUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin privileges required to clear market listings." });
        }

        try {
            await dbRun("DELETE FROM guild_trader_listings;");
            await dbRun("DELETE FROM item_prices;");
            res.json({
                success: true,
                message: "Successfully cleared all market listings and price entries."
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
}

// ============================================================================
// AUTHENTICATION & DEVELOPER BYPASS ENDPOINTS
// ============================================================================
const BCRYPT_SALT_ROUNDS = 12;

function hashPassword(password) {
    return bcrypt.hashSync(password || "", BCRYPT_SALT_ROUNDS);
}

function verifyPassword(password, storedHash) {
    if (!password || !storedHash) return false;
    // Check if the stored hash is a bcrypt hash
    if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
        try {
            return bcrypt.compareSync(password, storedHash);
        } catch {
            return false;
        }
    }
    // Legacy fallback: unsalted SHA-256 hash comparison
    const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
    return storedHash === legacyHash;
}

const SESSION_TTL_HOURS = parseInt(process.env.SESSION_TTL_HOURS, 10) || (24 * 7); // Default: 7 days

async function createSession(userId, ttlHours = SESSION_TTL_HOURS) {
    const token = `session_${userId}_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
    await dbRun(
        `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?);`,
        [token, userId, expiresAt]
    );
    return { token, expires_at: expiresAt };
}

async function deleteSession(token) {
    if (!token) return 0;
    const result = await dbRun(`DELETE FROM sessions WHERE token = ?;`, [token]);
    return result ? result.changes : 0;
}

async function purgeExpiredSessions() {
    try {
        const result = await dbRun(`DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now');`);
        if (result && result.changes > 0) {
            console.log(`[AUTH Purge] Purged ${result.changes} expired session(s) from SQLite.`);
        }
        return result ? result.changes : 0;
    } catch (err) {
        console.error("[AUTH Purge Error] Failed to purge expired sessions:", err.message);
        return 0;
    }
}

// Periodic cleanup of expired sessions every hour
setInterval(purgeExpiredSessions, 60 * 60 * 1000);
setTimeout(purgeExpiredSessions, 3000);

async function getAuthUserId(req) {
    let token = null;

    // 1. Check HttpOnly cookie first
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
        token = req.cookies[AUTH_COOKIE_NAME];
    }

    // 2. Check Authorization / x-auth-token header fallback
    if (!token) {
        const authHeader = req.headers["authorization"] || req.headers["x-auth-token"];
        if (authHeader) {
            token = authHeader.replace("Bearer ", "").trim();
        }
    }

    if (!token) return null;

    try {
        const session = await dbGet(
            `SELECT user_id, expires_at FROM sessions WHERE token = ? AND datetime(expires_at) > datetime('now');`,
            [token]
        );
        if (session) {
            return session.user_id;
        }

        // Support direct api_token lookup (for background sync / addon / scripts)
        const apiKeyUser = await dbGet(`SELECT id FROM users WHERE api_token = ?;`, [token]);
        if (apiKeyUser) {
            return apiKeyUser.id;
        }

        return null;
    } catch (err) {
        console.error("[AUTH Error] Error verifying session token:", err.message);
        return null;
    }
}

/**
 * POST /api/auth/register
 */
app.post("/api/auth/register", async (req, res) => {
    let { username, email, password, eso_handle } = req.body;
    if (!username || typeof username !== "string" || !email || typeof email !== "string" || !password || typeof password !== "string") {
        return res.status(400).json({ error: "Username, email, and password are required." });
    }

    username = username.trim();
    email = email.trim().toLowerCase();

    // Username validation: 3 to 32 alphanumeric characters, hyphens, and underscores
    const usernameRegex = /^[a-zA-Z0-9_-]{3,32}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: "Username must be between 3 and 32 alphanumeric characters (letters, numbers, hyphens, and underscores only)." });
    }

    // Email format validation (RFC-compliant regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
        return res.status(400).json({ error: "Please provide a valid email address." });
    }

    // Password validation: minimum 8 characters, maximum 128 characters
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }
    if (password.length > 128) {
        return res.status(400).json({ error: "Password cannot exceed 128 characters." });
    }

    try {
        const pwHash = hashPassword(password);
        const apiToken = `api_key_${crypto.randomBytes(16).toString("hex")}`;
        let handle = `@${username}`;
        if (eso_handle && typeof eso_handle === "string") {
            const trimmedHandle = eso_handle.trim();
            if (trimmedHandle.length > 0) {
                handle = trimmedHandle.startsWith("@") ? trimmedHandle : `@${trimmedHandle}`;
                if (handle.length > 64) handle = handle.substring(0, 64);
            }
        }

        const result = await dbRun(`
            INSERT INTO users (username, email, password_hash, eso_handle, api_token, role)
            VALUES (?, ?, ?, ?, ?, 'user');
        `, [username, email, pwHash, handle, apiToken]);

        const user = await dbGet(`SELECT id, username, email, eso_handle, role, api_token, created_at FROM users WHERE id = ?;`, [result.lastID]);
        const session = await createSession(user.id);

        res.cookie(AUTH_COOKIE_NAME, session.token, getAuthCookieOptions());
        res.json({ success: true, token: session.token, expires_at: session.expires_at, user });
    } catch (err) {
        res.status(400).json({ error: err.message.includes("UNIQUE") ? "Username or email already taken." : err.message });
    }
});

/**
 * POST /api/auth/login
 */
app.post("/api/auth/login", async (req, res) => {
    let { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || typeof usernameOrEmail !== "string" || !password || typeof password !== "string") {
        return res.status(400).json({ error: "Username/email and password are required." });
    }

    usernameOrEmail = usernameOrEmail.trim();
    if (usernameOrEmail.length === 0 || password.length === 0) {
        return res.status(400).json({ error: "Username/email and password cannot be empty." });
    }
    if (password.length > 128) {
        return res.status(400).json({ error: "Password cannot exceed 128 characters." });
    }

    try {
        const user = await dbGet(`
            SELECT id, username, email, password_hash, eso_handle, role, api_token, created_at 
            FROM users 
            WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?);
        `, [usernameOrEmail, usernameOrEmail]);

        if (!user) {
            return res.status(401).json({ error: "Invalid username/email or password." });
        }

        const isMatch = verifyPassword(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid username/email or password." });
        }

        // If user was stored with legacy SHA-256 hash, transparently migrate to bcrypt
        if (!user.password_hash.startsWith("$2a$") && !user.password_hash.startsWith("$2b$") && !user.password_hash.startsWith("$2y$")) {
            const upgradedHash = hashPassword(password);
            await dbRun(`UPDATE users SET password_hash = ? WHERE id = ?;`, [upgradedHash, user.id]);
            console.log(`[AUTH] Seamlessly upgraded password hash to bcrypt for user @${user.username} (ID: ${user.id})`);
        }

        const userPayload = {
            id: user.id,
            username: user.username,
            email: user.email,
            eso_handle: user.eso_handle,
            role: user.role,
            api_token: user.api_token,
            created_at: user.created_at
        };

        const session = await createSession(userPayload.id);

        res.cookie(AUTH_COOKIE_NAME, session.token, getAuthCookieOptions());
        res.json({ success: true, token: session.token, expires_at: session.expires_at, user: userPayload });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/auth/logout
 * Revokes the active session token from the SQLite store and clears the HttpOnly cookie
 */
app.post("/api/auth/logout", async (req, res) => {
    try {
        let token = req.cookies ? req.cookies[AUTH_COOKIE_NAME] : null;
        if (!token) {
            const authHeader = req.headers["authorization"] || req.headers["x-auth-token"];
            if (authHeader) {
                token = authHeader.replace("Bearer ", "").trim();
            }
        }
        if (token) {
            await deleteSession(token);
        }
        res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
        res.json({ success: true, message: "Logged out successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/auth/me
 */
app.get("/api/auth/me", async (req, res) => {
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Not authenticated." });
    }

    try {
        const user = await dbGet(`SELECT id, username, email, eso_handle, role, api_token, created_at FROM users WHERE id = ?;`, [userId]);
        if (!user) return res.status(404).json({ error: "User not found." });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// DEVELOPER BYPASS & ACCOUNT MANAGEMENT ENDPOINTS ([DEV])
// Gated strictly to non-production environments (NODE_ENV !== 'production')
// ============================================================================

if (isDevMode) {
    console.log("[DEV] Developer bypass and debug account management routes registered.");

    /**
     * GET /api/dev/users
     * Returns list of all registered accounts for developer bypass panel (safely omits api_token and password_hash)
     */
    app.get("/api/dev/users", async (req, res) => {
        try {
            const users = await dbAll(`
                SELECT u.id, u.username, u.email, u.eso_handle, u.role, u.created_at,
                       COUNT(c.id) AS character_count
                FROM users u
                LEFT JOIN characters c ON u.id = c.user_id
                GROUP BY u.id
                ORDER BY u.id ASC;
            `);
            res.json({ success: true, users });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/dev/bypass-login
     * Developer 1-click bypass to log into any account instantly without password
     */
    app.post("/api/dev/bypass-login", async (req, res) => {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: "user_id is required." });

        try {
            const user = await dbGet(`SELECT id, username, email, eso_handle, role, created_at FROM users WHERE id = ?;`, [user_id]);
            if (!user) return res.status(404).json({ error: "Account not found." });

            const session = await createSession(user.id);

            res.cookie(AUTH_COOKIE_NAME, session.token, getAuthCookieOptions());
            res.json({
                success: true,
                message: `[DEV BYPASS] Successfully logged into account: @${user.username}`,
                token: session.token,
                expires_at: session.expires_at,
                user
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/dev/users/:id
     * Developer edit account details (strictly requires admin authorization)
     */
    app.put("/api/dev/users/:id", async (req, res) => {
        const authUserId = await getAuthUserId(req);
        const authUser = authUserId ? await dbGet("SELECT role FROM users WHERE id = ?", [authUserId]) : null;
        if (!authUser || authUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin privileges required for developer user management." });
        }

        const userId = req.params.id;
        const { username, email, eso_handle, role } = req.body;

        try {
            await dbRun(`
                UPDATE users 
                SET username = COALESCE(?, username),
                    email = COALESCE(?, email),
                    eso_handle = COALESCE(?, eso_handle),
                    role = COALESCE(?, role)
                WHERE id = ?;
            `, [username, email, eso_handle, role, userId]);

            const user = await dbGet(`SELECT id, username, email, eso_handle, role, created_at FROM users WHERE id = ?;`, [userId]);
            res.json({ success: true, message: "Account updated successfully.", user });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/dev/users/:id
     * Developer delete account (strictly requires admin authorization)
     */
    app.delete("/api/dev/users/:id", async (req, res) => {
        const authUserId = await getAuthUserId(req);
        const authUser = authUserId ? await dbGet("SELECT role FROM users WHERE id = ?", [authUserId]) : null;
        if (!authUser || authUser.role !== "admin") {
            return res.status(403).json({ error: "Forbidden: Admin privileges required for developer user management." });
        }

        const userId = parseInt(req.params.id, 10);
        if (userId === 1) {
            return res.status(400).json({ error: "Cannot delete the primary root admin account (ID: 1)." });
        }

        try {
            await dbRun(`DELETE FROM characters WHERE user_id = ?;`, [userId]);
            await dbRun(`DELETE FROM users WHERE id = ?;`, [userId]);
            res.json({ success: true, message: `Account ID ${userId} and associated characters deleted.` });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
} else {
    // Disabled in production
    app.use(["/api/dev", "/api/market/dev"], (req, res) => {
        res.status(404).json({ error: "Developer endpoints are disabled in this environment." });
    });
}

// ============================================================================
// CHARACTER MANAGER ENDPOINTS
// ============================================================================

/**
 * POST /api/characters
 */
app.post("/api/characters", async (req, res) => {
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to manage characters." });
    }
    const { name, class: charClass, level, alliance, master_crafter_unlocked } = req.body;
    if (!name) return res.status(400).json({ error: "Character name is required." });

    try {
        await dbRun(`
            INSERT INTO characters (user_id, name, class, level, alliance, master_crafter_unlocked, last_sync_at)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(name) DO UPDATE SET
                user_id = excluded.user_id,
                class = COALESCE(excluded.class, class),
                level = COALESCE(excluded.level, level),
                alliance = COALESCE(excluded.alliance, alliance),
                master_crafter_unlocked = COALESCE(excluded.master_crafter_unlocked, master_crafter_unlocked),
                last_sync_at = CURRENT_TIMESTAMP;
        `, [userId, name, charClass || "Dragonknight", level || 50, alliance || 1, master_crafter_unlocked || 0]);

        const character = await dbGet(`SELECT * FROM characters WHERE name = ?;`, [name]);
        res.json({ success: true, message: "Character saved successfully.", character });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/characters/:id
 */
app.delete("/api/characters/:id", async (req, res) => {
    const userId = await getAuthUserId(req);
    if (!userId) {
        return res.status(401).json({ error: "Authentication required to delete characters." });
    }
    const charId = req.params.id;
    try {
        const char = await dbGet(`SELECT id, user_id FROM characters WHERE id = ?;`, [charId]);
        if (!char) {
            return res.status(404).json({ error: "Character not found." });
        }
        if (char.user_id !== userId) {
            return res.status(403).json({ error: "Forbidden: You do not have permission to delete this character." });
        }
        await dbRun(`DELETE FROM characters WHERE id = ? AND user_id = ?;`, [charId, userId]);
        res.json({ success: true, message: "Character removed from roster." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const gracefulShutdown = (signal) => {
    console.log(`\n[API SERVER] Received ${signal}. Starting graceful shutdown...`);
    server.close(() => {
        console.log("[API SERVER] HTTP server closed.");
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error("[DATABASE] Error closing SQLite connection:", err.message);
                    process.exit(1);
                } else {
                    console.log("[DATABASE] SQLite database connection closed cleanly.");
                    process.exit(0);
                }
            });
        } else {
            process.exit(0);
        }
    });

    // Fallback if shutdown hangs after 5 seconds
    setTimeout(() => {
        console.error("[API SERVER] Graceful shutdown timed out. Terminating process immediately.");
        process.exit(1);
    }, 5000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { app, server, gracefulShutdown };

