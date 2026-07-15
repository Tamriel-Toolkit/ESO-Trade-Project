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
    }
});
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

/**
 * GET api/character/:character_id
 * Returns all items associated with a specific character ID    
 */
app.get("/api/character/:character_id", (req, res) => {
    const characterId = parseInt(req.params.character_id, 10);
    if (isNaN(characterId)) {
        return res.status(400).json({ error: "Invalid character_id" });
    }

    db.all("SELECT * FROM knowledge WHERE character_id = ?", [characterId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "No items found for this character" });
        }

        const items = rows.map(row => {
            try {
                row.metadata = JSON.parse(row.metadata);
            } catch (e) {
                row.metadata = {};
            }
            return row;
        });

        res.json(items);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
