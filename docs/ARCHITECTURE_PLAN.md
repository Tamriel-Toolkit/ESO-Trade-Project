# Enterprise Engineering & Architecture Plan

## 1. Executive Summary & Vision Statement

### Endgoal Vision
Our objective is to build a **production-grade, 100% authentic, real-time crowdsourced ESO market intelligence platform**. 

By deploying our own native in-game AddOn (`ESOTradeAddon`) alongside a lightweight desktop daemon (`ESOTradeSync`), we create a seamless data pipeline:
$$\text{In-Game Kiosk Scan} \xrightarrow{\text{ESO Event Hook}} \text{SavedVariables} \xrightarrow{\text{Desktop Watcher}} \text{Central Cloud API} \xrightarrow{\text{Web Platform}}$$

Every player using our addon continuously feeds live market listings into our central engine, enabling instant deal detection, valuation indexing, and comprehensive search for all users worldwide.

---

## 2. Mimicking & Improving the TTC Dataflow

```text
[TTC Proven Model]                               [Our Optimized Architecture]
1. Addon logs to TamrielTradeCentre.lua       1. ESOTrade Addon logs to ESOTrade.lua
2. Client uploads to TTC API                  2. ESOTradeSync daemon auto-uploads via REST/WS
3. TTC processes & serves web portal         3. Node.js Backend ingests to SQLite/Postgres
4. Client pulls PriceTable.lua to game        4. Backend serves web app & pushes in-game prices
```

---

## 3. Critical Constraints & Core Criteria

| Criterion | Requirement & Enforcement |
| :--- | :--- |
| **Data Authenticity** | **100% Real Data Only**. Zero synthetic listings, zero dummy fallbacks (`Möad Mërchants` strictly forbidden). |
| **Search Coverage** | **Guaranteed Access**. If a listing exists in a scanned kiosk, any user searching via name or category filter **MUST** see it instantly. |
| **ZOS TOS Compliance** | **Strict API Compliance**. Uses official ESO Lua AddOn API hooks (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). Zero DLL injection or memory manipulation. |
| **Game Client Safety** | **Zero Stutter**. Asynchronous event handling, efficient table buffering, and minimal memory allocation to prevent FPS drops. |
| **Idempotency** | **Deduplication Engine**. Simultaneous scans of the same kiosk by multiple users must be merged without creating duplicate rows. |

---

## 4. Deep-Dive Component Architecture

### Component A: Native In-Game Addon (`ESOTradeAddon`)
- **Location**: `Documents/Elder Scrolls Online/live/AddOns/ESOTrade/`
- **Files**: `ESOTrade.txt` (manifest), `ESOTrade.lua` (core logic)
- **Event Subscriptions**:
  - `EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`: Triggered whenever kiosk data is returned by ESO server.
- **Data Schema in `ESOTrade.lua`**:
  ```lua
  ESOTradeVars = {
    ["Account"] = "@DisplayName",
    ["Server"]  = "NA",
    ["Scans"]   = {
      [1] = {
        ["ItemId"]   = 54177,
        ["Link"]     = "|H0:item:54177:363:50:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0|h|h",
        ["Name"]     = "Dreugh Wax",
        ["Price"]    = 8500,
        ["Qty"]      = 10,
        ["Guild"]    = "Righteous Evil",
        ["Location"] = "Mournhold, Deshaan",
        ["Time"]     = 1722387600
      }
    }
  }
  ```

### Component B: Desktop Sync Daemon (`ESOTradeSync`)
- **Implementation**: Lightweight Python/Node system-tray daemon (`backend/data-pipeline/watcher.py`).
- **File System Watcher**: Monitors `SavedVariables/ESOTrade.lua` using OS-level file system change events.
- **Network Protocol**: Compresses `ESOTradeVars` into JSON payload and sends HTTP `POST` to `/api/market/upload-scans`.

### Component C: Central Backend Ingestion & Deduplication
- **Endpoint**: `POST /api/market/upload-scans` in `server.js`.
- **Deduplication Strategy**:
  $$\text{Listing Hash} = \text{MD5}(\text{game\_item\_id} + \text{server} + \text{guild\_name} + \text{price} + \text{quantity} + \text{discovered\_at\_date})$$
  Uses SQL `ON CONFLICT` / `UPSERT` to update timestamp and prevent duplicate listing rows.
