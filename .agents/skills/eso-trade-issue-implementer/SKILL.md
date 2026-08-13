---
name: eso-trade-issue-implementer
description: >-
  Use this skill when the user asks to implement, fix, or resolve any GitHub
  issue on the ESO-Trade-Project repository. Covers all subsystems: backend
  API (Express/SQLite), data pipeline (Python), frontend UI (React/Vite),
  documentation, security hardening, and database schema changes. Provides
  full architecture context, file maps, coding conventions, testing, and
  deployment verification procedures specific to this codebase. Automatically
  creates a new dedicated git branch and opens a Draft Pull Request (Draft PR)
  on GitHub upon finishing the first implementation attempt.
---

# ESO Trade Project — Issue Implementation Skill

This skill gives you everything needed to implement any issue filed against
the ESO-Trade-Project. Read this document fully before making changes.

---

## 1. Project Architecture At-a-Glance

```
ESO-Trade-Project/
├── backend/
│   ├── server.js              # Express 5.2 API — 1,580 LOC, 32 routes, SQLite3
│   ├── package.json           # Dependencies: express, cors, sqlite3
│   └── exports/
│       └── eso_catalog.db     # SQLite database (~232 MB, 155K catalog items)
│
├── backend/data-pipeline/     # Python ingestion scripts
│   ├── fetch_and_ingest.py    # UESP API → items.json (master catalog)
│   ├── populate_sqlite.py     # items.json → SQLite `items` table
│   ├── fetch_market_data.py   # TTC Lua archives → `item_prices` table
│   ├── live_trader_extractor.py  # Playwright scraper → `guild_trader_listings`
│   ├── parse_esotrade_addon.py   # Native addon SavedVariables → DB + API sync
│   ├── parse_saved_variables.py  # Legacy TTC SavedVariables → DB
│   ├── auto_live_ingest.py    # Automated TTC zip download + ingest
│   ├── watcher.py             # File-watching daemon (triggers parsers on change)
│   ├── purge_synthetic_listings.py  # Data authenticity enforcer
│   ├── validate_items.py      # JSON schema validator
│   ├── debug_diag.py          # Diagnostic regex parser tester
│   ├── test_api_endpoints.js  # Integration tests (4 GET endpoints)
│   ├── test_db_queries.py     # DB validation queries
│   └── requirements.txt       # Python deps (requests, playwright, etc.)
│
├── frontend/                  # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx            # Router: Home, Marketplace, CharacterManager, Login
│   │   ├── pages/
│   │   │   ├── Marketplace.jsx     # 925 LOC — search, filters, listings grid
│   │   │   ├── CharacterManager.jsx # 383 LOC — character roster, crafting
│   │   │   ├── Home.jsx            # Landing page + system overview
│   │   │   └── Login.jsx           # Auth page (stub — 10 LOC)
│   │   ├── api/api.js              # All API client functions (219 LOC)
│   │   ├── context/AuthContext.jsx  # Auth state provider
│   │   ├── components/
│   │   │   ├── ui/                 # 11 reusable UI components
│   │   │   ├── character/          # Character-specific components
│   │   │   └── dev/                # DevAccountModal (admin panel)
│   │   ├── lib/utils.jsx           # Tailwind cn() merge utility
│   │   ├── index.css               # Global styles
│   │   └── App.css                 # App-level styles
│   ├── vite.config.js
│   └── package.json
│
├── docs/                      # Architecture, schema, guides
│   ├── ARCHITECTURE_PLAN.md
│   ├── DatabaseSchema.md
│   ├── DataAcquisitionReport.md
│   ├── DevPlan.md
│   └── USER_CROWDSOURCING_GUIDE.md
│
└── .agents/AGENTS.md          # Inviolable engineering rules
```

---

## 2. Inviolable Rules (NEVER Break These)

These rules come from `.agents/AGENTS.md` and override everything else:

1. **100% Data Authenticity**: NEVER create synthetic listings, fake guild
   names, placeholder market data, or mock price generators. Every row in
   `guild_trader_listings` and `item_prices` must trace to a real ESO source.

2. **Search Criteria Guarantee**: If a listing exists in the DB, a user
   searching by name or category filter MUST find it. Never silently drop
   results via UI filtering, pagination bugs, or query errors.

3. **ZOS TOS Compliance**: The Lua addon may ONLY use official ESO API hooks
   (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). No memory manipulation, no
   DLL injection, no direct network calls inside Lua. All network I/O
   happens via `watcher.py` on the desktop side.

4. **Data Pipeline Integrity**: The catalog is 155,476 items from UESP.
   Price data comes from official TTC `PriceTableNA.lua` archives.
   Live listings come from in-game addon scans or Playwright web scraping.

---

## 3. Database Schema Reference

**Engine**: SQLite 3 — `backend/exports/eso_catalog.db`
**FK enforcement**: `PRAGMA foreign_keys = ON;`

| Table | Primary Key | Key Columns | Created In |
|---|---|---|---|
| `items` | `game_item_id` | name, category, subcategory, rarity, type, set_name, icon | `populate_sqlite.py` |
| `characters` | `id` (auto) | user_id, name, class, level, alliance, master_crafter_unlocked | `server.js` |
| `knowledge` | (character_id, game_item_id) | is_known, learned_at | `server.js` |
| `character_gear` | `id` (auto) | character_id, slot_id, item_name, quality, trait_id, set_name | `server.js` |
| `item_prices` | (game_item_id, server) | avg_price, min_price, max_price, suggested_price | `server.js` |
| `guild_trader_listings` | `id` (auto) | game_item_id, server, seller_name, price, quantity, guild_name, location, quality | `server.js` |
| `watchlists` | (character_id, game_item_id) | target_price | `server.js` |
| `user_inventory` | — | character_id, game_item_id, quantity | `server.js` |
| `users` | `id` (auto) | username, email, password_hash, eso_handle, api_token, role | `server.js` |

**Key Indexes**:
- `idx_unique_seller_listing` — compound UNIQUE on (game_item_id, server, guild_name, seller_name, price, quantity, level, quality, trait_id)
- `idx_listings_game_item_id` — on guild_trader_listings(game_item_id)

---

## 4. Tech Stack & Conventions

### Backend (Node.js)
- **Framework**: Express 5.2.1 (async route handlers)
- **Database**: `sqlite3` package with promisified wrappers (`dbRun`, `dbGet`, `dbAll`)
- **Auth**: Custom token-based sessions via `activeSessions` Map + `getAuthUserId(req)`
- **Patterns**:
  - All SQL uses parameterized queries (`?` placeholders) — NEVER concatenate user input
  - Batch inserts chunk arrays to stay under SQLite's 999-parameter limit
  - Transactions use `BEGIN IMMEDIATE TRANSACTION` / `COMMIT` / `ROLLBACK`
  - Error responses: `res.status(XXX).json({ error: err.message })`
  - Success responses: `res.json({ success: true, ...data })`
- **CORS**: `process.env.FRONTEND_URL || "http://localhost:5173"`
- **Port**: `process.env.PORT || 5001`

### Frontend (React)
- **Build**: Vite
- **Styling**: Tailwind CSS with ESO-themed custom palette:
  - Background: `#0a0a0d` (deep dark)
  - Parchment text: `#e0d8c3`
  - Gold accents: `#c5a059`, `#d4af37`
  - Muted text: `#8a8275`
- **Fonts**: `Cinzel` for headings, system sans-serif for body
- **State Management**: React `useState` / `useEffect` / `useMemo`
- **API Layer**: All API calls go through `frontend/src/api/api.js`
- **Routing**: React Router with pages in `frontend/src/pages/`
- **Components**: `frontend/src/components/ui/` for reusable UI primitives

### Data Pipeline (Python)
- **Python 3** with `requests`, `playwright`, `sqlite3` stdlib
- **Lua Parsing**: Custom regex-based parser (not a full Lua interpreter)
- **File Monitoring**: `os.path.getmtime()` polling in `watcher.py`

---

## 5. Issue Implementation Workflow

When assigned an issue, follow this exact workflow:

### Step 1: Read the Issue
- Read the full issue body from GitHub (use `issue_read` MCP tool if needed)
- Identify: severity, affected files, required changes, estimated effort

### Step 2: Locate Affected Files
Use this quick reference to find what to edit:

| Issue Category | Primary Files |
|---|---|
| **Security** | `backend/server.js` (auth section L:1500-1700) |
| **API Routes** | `backend/server.js` (find route by path grep) |
| **Database Schema** | `backend/server.js` (`initializeDatabaseSchema` L:36-159), `backend/data-pipeline/populate_sqlite.py` |
| **Data Pipeline** | `backend/data-pipeline/*.py` |
| **Frontend UI** | `frontend/src/pages/*.jsx`, `frontend/src/components/**/*.jsx` |
| **Frontend API** | `frontend/src/api/api.js` |
| **Auth/Sessions** | `backend/server.js` (L:1500-1700), `frontend/src/context/AuthContext.jsx` |
| **Styling** | `frontend/src/index.css`, `frontend/src/App.css`, inline Tailwind classes |
| **Documentation** | `docs/*.md`, `README.md`, `backend/README.md` |
| **Dependencies** | `backend/package.json`, `frontend/package.json`, `backend/data-pipeline/requirements.txt` |
| **TOS / Addon** | `backend/data-pipeline/parse_esotrade_addon.py`, `backend/data-pipeline/watcher.py` |

### Step 3: Implement the Fix
- Read the target file(s) in full before editing
- Make minimal, surgical changes — don't refactor unrelated code
- Preserve all existing comments and docstrings
- Follow the coding conventions in Section 4

### Step 4: Verify
Run appropriate verification based on what you changed:

**Backend changes**:
```bash
cd backend
node server.js                          # Verify server starts clean
node data-pipeline/test_api_endpoints.js  # Run integration tests
```

**Frontend changes**:
```bash
cd frontend
npm run build                           # Verify zero build errors
npm run dev                             # Start dev server for visual check
```

**Python pipeline changes**:
```bash
cd backend/data-pipeline
python validate_items.py                # Verify items.json integrity
python test_db_queries.py               # Verify DB state
```

**Database schema changes**:
```bash
# Test that the schema initializes without errors by restarting the server
cd backend && node -e "const s=require('sqlite3');const d=new s.Database('./exports/eso_catalog.db');d.all('SELECT COUNT(*) as c FROM items',(_,r)=>{console.log('Items:',r[0].c);d.close()})"
```

### Step 5: Create a Dedicated Git Branch & Commit
Every time an issue resolution is attempted:
1. Create and switch to a descriptive branch (e.g. `fix/issue-<N>-<short-slug>` or `feat/issue-<N>-<short-slug>`):
   ```bash
   git checkout -b fix/issue-25-bcrypt-password-hashing
   ```
2. Stage modified files and make a clean, structured commit referencing the issue number:
   ```bash
   git add <changed-files>
   git commit -m "fix(#25): replace unsalted SHA-256 password hashing with bcrypt"
   ```
3. Push the branch to the remote origin:
   ```bash
   git push -u origin fix/issue-25-bcrypt-password-hashing
   ```

### Step 6: Open a Draft Pull Request (Draft PR)
Immediately after finishing the first implementation attempt, open a **Draft Pull Request** on GitHub against the `main` branch:
1. Use the GitHub MCP tool `create_pull_request` with `draft: true`:
   - `owner`: `"RyanS4"`
   - `repo`: `"ESO-Trade-Project"`
   - `title`: `"[Draft] Fix #<N>: <Issue Title>"`
   - `head`: `"fix/issue-<N>-<short-slug>"`
   - `base`: `"main"`
   - `body`: Detailed markdown summary describing the problem, solution, files changed, verification results, and `Fixes #<N>`.
   - `draft`: `true`

2. Post a comment on the target GitHub Issue referencing the newly created Draft PR URL and summarizing the implementation.

### Step 7: Re-evaluate & Synchronize Backlog Priority Queue
To maintain the central zero-maintenance execution queue for both human maintainers and future agents:
1. Call `issue_write` (method `update`) on **Master Tracking Issue #35** on GitHub:
   - Update the resolved issue's status to `🟢 In Review (PR #<PR_NUMBER>)`.
   - Check if any downstream issues were blocked by this issue, and update their status to `🟢 Ready to Start` / `⚪ Queued`.
   - Ensure the next unblocked item is clearly identified as **Rank #1**.
2. If working on `main`, synchronize [`.agents/PRIORITY_QUEUE.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/PRIORITY_QUEUE.md) with the updated priority matrix.

---

## 6. Common Issue Patterns & Recipes

### Pattern A: Security Hardening (server.js auth section)
The auth system lives at `server.js` lines 1500-1700. Key functions:
- `hashPassword(password)` — currently SHA-256, needs bcrypt upgrade
- `generateToken(user)` — creates `session_<id>_<hex>` tokens
- `activeSessions` (Map) — in-memory session store
- `getAuthUserId(req)` — extracts user ID from `Authorization` header

**To gate dev routes behind NODE_ENV**:
```js
if (process.env.NODE_ENV !== 'production') {
    app.post("/api/dev/bypass-login", async (req, res) => { ... });
    // ...other dev routes
}
```

### Pattern B: Adding/Modifying API Routes (server.js)
1. Find the right section by searching for the comment block header
2. Use `async (req, res) => {}` handlers with `try/catch`
3. Always return `{ success: true, ...data }` or `{ error: msg }`
4. For write operations, use transactions:
```js
try {
    await dbRun("BEGIN IMMEDIATE TRANSACTION");
    // ... operations ...
    await dbRun("COMMIT");
    res.json({ success: true });
} catch (err) {
    await dbRun("ROLLBACK");
    res.status(500).json({ error: err.message });
}
```

### Pattern C: Frontend Component Changes
1. Components use Tailwind classes with ESO theme colors
2. All API calls route through `frontend/src/api/api.js`
3. To add a new API function, follow the existing pattern:
```js
export async function myNewFunction(params) {
    const res = await fetch(`${API_BASE}/api/my-endpoint`, {
        headers: getAuthHeaders(),
    });
    return res.json();
}
```
4. Loading states: use `isLoading` boolean, render themed spinner
5. Empty states: always provide contextual help text and action buttons

### Pattern D: Database Schema Migration
The schema auto-initializes in `server.js:initializeDatabaseSchema()`.
To add a column to an existing table:
```js
// Add in the serialize() block after the CREATE TABLE
db.run("ALTER TABLE my_table ADD COLUMN new_col TYPE DEFAULT value;", () => {});
```
The empty callback silently ignores "duplicate column" errors for
idempotent migrations.

### Pattern E: Documentation Updates
- Schema docs: `docs/DatabaseSchema.md`
- Architecture: `docs/ARCHITECTURE_PLAN.md`
- User guide: `docs/USER_CROWDSOURCING_GUIDE.md`
- README: root `README.md`
Keep docs consistent with actual code — always cross-reference.

### Pattern F: Data Pipeline Changes (Python)
- All DB paths use `../exports/eso_catalog.db` relative to the script
- Use parameterized queries in Python too: `cursor.execute("... ?", (val,))`
- Never generate synthetic data — if a network fetch fails, fail gracefully
  or use cached data, but NEVER fabricate records

---

## 7. GitHub Issue & PR Management via MCP / Git CLI

Use these MCP tools and CLI commands for the full issue-to-PR lifecycle:

```bash
# 1. Read the issue details
call_mcp_tool github-mcp-server issue_read {owner: "RyanS4", repo: "ESO-Trade-Project", issue_number: <N>}

# 2. Create feature branch and push changes
git checkout -b fix/issue-<N>-<short-description>
git add <files>
git commit -m "fix(#<N>): <summary>"
git push -u origin fix/issue-<N>-<short-description>

# 3. Create a DRAFT Pull Request (MANDATORY after first attempt)
call_mcp_tool github-mcp-server create_pull_request {
  owner: "RyanS4",
  repo: "ESO-Trade-Project",
  title: "[Draft] Fix #<N>: <Issue Title>",
  head: "fix/issue-<N>-<short-description>",
  base: "main",
  draft: true,
  body: "## Summary\nResolves #<N> by ...\n\n## Changes Made\n- ...\n\n## Verification\n- ...\n\nCloses #<N>"
}

# 4. Add a comment to the issue with the Draft PR link
call_mcp_tool github-mcp-server add_issue_comment {
  owner: "RyanS4",
  repo: "ESO-Trade-Project",
  issue_number: <N>,
  body: "Draft PR created for review: #<PR_NUMBER> (<PR_URL>)"
}
```

---

## 8. Pre-Flight & PR Checklist

Before completing an issue resolution turn, verify ALL of the following:

- [ ] No synthetic/fake data introduced (grep for fabricated guild names)
- [ ] All SQL queries use parameterized `?` placeholders
- [ ] Backend server starts without errors (`node server.js`)
- [ ] Frontend builds without errors (`npm run build`)
- [ ] Existing tests still pass
- [ ] Changes don't break the Search Criteria Guarantee
- [ ] Documentation updated if schema or API routes changed
- [ ] No hardcoded secrets, tokens, or passwords added
- [ ] Code follows existing conventions (Section 4)
- [ ] **Dedicated Git Branch created and pushed to `origin`**
- [ ] **Draft Pull Request created on GitHub (`draft: true`) with issue linked**
- [ ] **Master Tracking Issue #35 updated on GitHub with latest PR and unblocked status**

