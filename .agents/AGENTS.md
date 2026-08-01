# ESO Trade Project - Architecture & Engineering Rules

## Critical System Constraints
1. **100% Data Authenticity**: Synthetic or hallucinated listings/guild names (e.g. `Möad Mërchants`) are strictly forbidden.
2. **Search Criteria Guarantee**: If an active guild trader listing exists in the database, any user searching via name or category filter MUST be able to view it instantly.
3. **Data Pipeline Architecture**:
   - **Macro Market Data**: 155,476 catalog items with price statistics (`item_prices`) populated from official TTC `PriceTableNA.lua` archives.
   - **Micro Live Listings**: Populated via native in-game `ESOTrade` addon + `watcher.py` desktop sync daemon (`POST /api/market/upload-scans`) and on-demand web searches (`POST /api/market/listings/extract`).
4. **ZOS TOS Compliance**: Strictly use official ESO Lua Addon API hooks (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). No memory manipulation or direct network calls inside Lua.
