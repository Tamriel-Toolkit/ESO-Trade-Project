# ESO Trade Project - Architecture & Engineering Rules

## Critical System Constraints
1. **100% Data Authenticity**: Synthetic or hallucinated listings/guild names (e.g. `Möad Mërchants`) are strictly forbidden.
2. **Search Criteria Guarantee**: If an active guild trader listing exists in the database, any user searching via name or category filter MUST be able to view it instantly.
3. **Data Pipeline Architecture**:
   - **Master Catalog**: 155,476 UESP catalog items provide static identity, taxonomy, set metadata, and source icon paths. Catalog refreshes must use safe upserts.
   - **Live Listings**: Populated only through the native in-game `ESOTrade` addon and `watcher.py` desktop sync daemon (`POST /api/market/upload-scans`).
   - **Icon Delivery**: Browsers use the backend `/api/icons/:filename` cache endpoint, never an upstream image URL.
4. **ZOS TOS Compliance**: Strictly use official ESO Lua Addon API hooks (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). No memory manipulation or direct network calls inside Lua.
5. **Zero Stale Queue Re-insertion**: Merged pull requests and closed issues are permanently completed. They MUST NEVER be re-inserted into the active Live Execution Matrix table or marked as 'In Review' after merging. Always query closed issues and run `.agents/scripts/sync_priority_queue.js` when updating queue documentation.
6. **Standardized Issue Review Protocol**: Every time the user asks to review an issue or the next issue in the queue, follow `.agents/skills/eso-trade-issue-reviewer/SKILL.md`. Critically evaluate the 4 required dimensions (Large-scale impact & necessity, Amendments/closure/reprioritization, 1–5 Proposed solutions with a recommended label, and Additional comments/considerations) and append the uniform table at the bottom of the output.
