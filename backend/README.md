# Express API Server (`server.js`) Documentation & Developer Guide

This document describes the design, API endpoints, and development guidelines for the Elder Scrolls Online (ESO) Personalized Collection & Trading Platform backend.

---

## 🏗️ Architecture Overview

The backend is built as a lightweight **Node.js Express server** powered by **SQLite** (`eso_catalog.db`). 

Key architectural components:
*   **Persistent SQLite DB:** Handles the master items catalog, account/character profiles, knowledge flags, watchlists, inventory duplicates, and market listings.
*   **PRAGMA Foreign Keys:** SQLite has foreign key constraints enabled explicitly (`PRAGMA foreign_keys = ON;`) to support cascading deletes (e.g. deleting a character cleans up their watchlist, duplicates, and knowledge mappings).
*   **Promise Helpers:** Chained async/await wrappers are used instead of nested callback hell for transactions and sequential queries.

---

## 📚 API Endpoint Reference

### 1. Catalog & Taxonomy Endpoints

#### `GET /api/taxonomy`
*   **Description:** Returns all unique categories and subcategories in the items catalog. Used to build dynamic filters in the UI.
*   **Response (200 OK):**
    ```json
    {
      "Weapon": ["Axe", "Bow", "Dagger", "Destruction Staff"],
      "Armor": ["Heavy Armor", "Light Armor", "Medium Armor"]
    }
    ```

#### `GET /api/items`
*   **Description:** Paginated filtering search across the master item database.
*   **Query Parameters:**
    *   `search` (string): Fuzzy matching name (e.g., `Briarheart`).
    *   `category` (string): Exact match.
    *   `subcategory` (string): Exact match.
    *   `rarity` (integer): Exact match.
    *   `limit` (integer): Default 20, max 100.
    *   `offset` (integer): Default 0.
*   **Response (200 OK):**
    ```json
    {
      "total": 1500,
      "limit": 20,
      "offset": 0,
      "items": [
        {
          "id": "item-000068447",
          "game_item_id": 68447,
          "name": "Briarheart Jack",
          "item_type": "Armor",
          "category": "Armor",
          "subcategory": "Medium Armor",
          "rarity": 4,
          "icon_url": "https://esoicons.uesp.net/...",
          "metadata": { "set": { "name": "Briarheart" } }
        }
      ]
    }
    ```

#### `GET /api/items/:game_item_id`
*   **Description:** Single item lookup using the authoritative in-game item ID.
*   **Response (200 OK):**
    ```json
    {
      "id": "item-000068447",
      "game_item_id": 68447,
      "name": "Briarheart Jack",
      "metadata": { ... }
    }
    ```
*   **Response (404 Not Found):** `{"error": "Item not found"}`

---

### 2. Character & Knowledge Sync

#### `GET /api/characters`
*   **Description:** Lists all registered character profiles in the database.
*   **Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "name": "Adyr",
        "class": "Templar",
        "level": 50,
        "is_master_crafter": true,
        "last_sync_at": "2026-07-15 06:35:28"
      }
    ]
    ```

#### `POST /api/characters/sync`
*   **Description:** Syncs character stats and motifs/recipes they know. Creates or updates the character and overwrites their knowledge entries in a secure transaction.
*   **Body Payload:**
    ```json
    {
      "name": "Adyr",
      "class": "Templar",
      "level": 50,
      "is_master_crafter": true,
      "known_items": [1129, 1321]
    }
    ```
*   **Response (200 OK):** `{"success": true, "character_id": 1}`

#### `GET /api/character/:character_id`
*   **Description:** Retrieves all items synchronized to a character (SQL JOIN with `items`).
*   **Response (200 OK):**
    ```json
    [
      {
        "game_item_id": 1129,
        "name": "Maple Bow",
        "is_known": true,
        "learned_at": "2026-07-15 06:35:28",
        "metadata": { ... }
      }
    ]
    ```
*   **Response (404 Not Found):** `{"error": "Character not found"}`

---

### 3. Market Pricing & Listing Ingestion

#### `POST /api/prices/sync`
*   **Description:** Batch upserts market statistics (suggested price, min, max, average) for NA/EU servers.
*   **Body Payload:**
    ```json
    [
      {
        "game_item_id": 1129,
        "server": "NA",
        "avg_price": 5000,
        "min_price": 4000,
        "max_price": 6000,
        "suggested_price": 4800
      }
    ]
    ```
*   **Response (200 OK):** `{"success": true, "count": 1}`

#### `POST /api/listings/sync`
*   **Description:** Batch upserts active Guild Trader sales. Deletes expired items automatically.
*   **Body Payload:**
    ```json
    {
      "server": "NA",
      "listings": [
        {
          "game_item_id": 1129,
          "price": 4500,
          "quantity": 1,
          "guild_name": "Tamriel Trade Federation",
          "location": "Grahtwood",
          "expires_at": "2030-01-01 12:00:00"
        }
      ]
    }
    ```
*   **Response (200 OK):** `{"success": true, "count": 1}`

#### `POST /api/inventory/sync`
*   **Description:** Syncs duplicate inventory bags owned by a character to allow trading matches.
*   **Body Payload:**
    ```json
    {
      "character_id": 1,
      "inventory": [
        {
          "game_item_id": 1321,
          "quantity": 2
        }
      ]
    }
    ```
*   **Response (200 OK):** `{"success": true, "count": 1}`

---

## 4. Matching Engines (Personalized Shop & Trade Matcher)

#### `GET /api/listings/personalized/:character_id`
*   **Description:** Returns active listings for items the character **does not know** (not in `knowledge` where `is_known = 1`).
*   **Deal Logic:** Sorts listings by a "Value Index" ($suggested\_price / listing\_price$) so that items listed below market values bubble to the top.
*   **Query Parameters:**
    *   `server` (string): `"NA"` (default) or `"EU"`.
    *   `limit` (integer): Default 20.
    *   `offset` (integer): Default 0.
*   **Response (200 OK):**
    ```json
    {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "listings": [
        {
          "listing_id": 8,
          "game_item_id": 1727,
          "price": 8000,
          "suggested_price": 10000,
          "value_index": 1.25,
          "item_name": "Brackenleaf's Bough"
        }
      ]
    }
    ```

#### `GET /api/trades/matches/:character_id`
*   **Description:** Finds other characters on the platform who have duplicate inventory matching items the specified character does not know (`is_known = 0`).
*   **Response (200 OK):**
    ```json
    [
      {
        "matching_character_id": 10,
        "matching_character_name": "Hlaalu",
        "game_item_id": 1321,
        "duplicate_quantity": 2,
        "item_name": "Maple Bow",
        "item_metadata": { ... }
      }
    ]
    ```

---

## 5. Watchlist & Custom Price Alerts

#### `GET /api/watchlist/:character_id`
*   **Description:** Lists all watchlisted items for a character alongside their current average pricing.
*   **Response (200 OK):**
    ```json
    [
      {
        "game_item_id": 1727,
        "target_price": 8500,
        "is_notified": false,
        "item_name": "Brackenleaf's Bough",
        "avg_price": 10000
      }
    ]
    ```

#### `POST /api/watchlist`
*   **Description:** Adds an item to the character's watchlist or updates the target alert threshold.
*   **Body Payload:**
    ```json
    {
      "character_id": 1,
      "game_item_id": 1727,
      "target_price": 8500
    }
    ```
*   **Response (200 OK):** `{"success": true, ...}`

#### `DELETE /api/watchlist/:character_id/:game_item_id`
*   **Description:** Removes an item from the character's watchlist.
*   **Response (200 OK):** `{"success": true, "message": "Item removed from watchlist"}`

#### `GET /api/watchlist/:character_id/alerts`
*   **Description:** Compares the character's watchlist thresholds with current active listings, returning immediate purchasing recommendations.
*   **Response (200 OK):**
    ```json
    [
      {
        "game_item_id": 1727,
        "target_price": 8500,
        "listed_price": 8000,
        "guild_name": "Capitalist Guild",
        "location": "Mournhold",
        "item_name": "Brackenleaf's Bough"
      }
    ]
    ```

---

## 💻 Developer Guide: Creating New API Functions

To extend this server, developers should adhere to the established styling, validation, and database access conventions.

### Step 1: Use Promise Helper Functions
Never call nested callback logic like `db.all("...", (err, rows) => { ... })` directly inside route handlers. Instead, use the global wrappers:
*   `dbRun(sql, params)`: For statements that write to the database (`INSERT`, `UPDATE`, `DELETE`).
*   `dbGet(sql, params)`: For returning a single row (`SELECT` with limit 1).
*   `dbAll(sql, params)`: For returning lists of rows.

These functions return native Javascript Promises and enable clean `async/await` syntax.

### Step 2: Structure Route Handlers with Try/Catch
Always wrap database actions in `try/catch` blocks to handle connection/query errors gracefully and respond with a `500` status rather than crashing the node process.

### Step 3: Implement Transactions for Multi-Step Operations
When performing syncs or multiple database updates, wrap the process in `BEGIN IMMEDIATE TRANSACTION` and `COMMIT` queries. If an error is caught, rollback changes inside the `catch` block:
```javascript
try {
    await dbRun("BEGIN IMMEDIATE TRANSACTION");
    // Database modifications...
    await dbRun("COMMIT");
} catch (err) {
    try { await dbRun("ROLLBACK"); } catch (e) { console.error(e); }
    res.status(500).json({ error: err.message });
}
```

### Step 4: Safely Parse JSON Metadata
SQLite does not support native JSON fields and stores them as stringified text blocks. If returning data from the `items` table, you must map the results and safely parse the `metadata` column:
```javascript
const items = rows.map(row => {
    try {
        row.metadata = JSON.parse(row.metadata);
    } catch (e) {
        row.metadata = {};
    }
    return row;
});
```

---

### 📝 Step-by-Step Example: Adding a New Route

Suppose we want to add a `POST /api/character/delete` endpoint. Here is how you would implement it:

1.  Open [server.js](file:///home/ryan/Desktop/ESO-Trade-Project/backend/server.js).
2.  Define the route handler before the `// Start server` comment block:
    ```javascript
    /**
     * POST /api/character/delete
     * Removes a character from the database.
     * Knowledge, inventory and watchlist entries are cleaned up automatically via cascade deletes.
     */
    app.post("/api/character/delete", async (req, res) => {
        const { character_id } = req.body;

        if (!character_id) {
            return res.status(400).json({ error: "character_id is required." });
        }

        try {
            // 1. Verify existence
            const character = await dbGet("SELECT id FROM characters WHERE id = ?", [character_id]);
            if (!character) {
                return res.status(404).json({ error: "Character not found" });
            }

            // 2. Perform delete statement
            await dbRun("DELETE FROM characters WHERE id = ?", [character_id]);
            res.json({ success: true, message: `Character ${character_id} deleted successfully.` });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    ```
3.  Restart the Node process (or let `nodemon` auto-reload) and test via Curl:
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"character_id":1}' http://localhost:5000/api/character/delete
    ```
