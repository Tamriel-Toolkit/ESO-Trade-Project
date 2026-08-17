---
name: eso-trade-maintenance-scanner
description: >-
  Deeply scans the ESO Trade Project repository (RyanS4/ESO-Trade-Project) for
  codebase maintenance fixes, security vulnerabilities, backend bugs, unhandled
  rejections, unindexed SQL queries, dead legacy code, data integrity gaps, and
  technical debt. Runs strictly in Read-Only / Output-Only discovery mode to present
  prioritized audit reports and draft issues directly to the user for review.
---

# ESO Trade Project — Codebase Maintenance & Repair Scanner Skill

Use this skill whenever asked to "audit the codebase", "scan for bugs or technical debt", "find maintenance issues", "run a security inspection", or "search for unlisted tasks to work on".

---

## 🔒 Inviolable Operating Constraint: Read-Only / Output-Only Mode

> [!IMPORTANT]
> **READ-ONLY DISCOVERY MODE**: This skill is strictly designed for **analysis, discovery, and user presentation**. 
> When executing this skill:
> - **DO NOT** modify, edit, create, or delete any source code files.
> - **DO NOT** call GitHub MCP write tools (`create_pull_request`, `issue_write`, etc.) to open issues or PRs automatically.
> - **MUST ONLY** output your structured findings, prioritized triage lists, and proposed remediation plans directly to the user in chat or an artifact report (`proposed_issues.md` / `audit_report.md`).

---

## 🏛️ Inviolable Core System Constraints

When evaluating the codebase, verify that all systems strictly comply with [`.agents/AGENTS.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md):

1. **100% Data Authenticity**: Synthetic or hallucinated listings/guild names (e.g. `Möad Mërchants`) are strictly forbidden. All price and listing data must originate from official TTC `PriceTableNA.lua` archives, in-game `ESOTrade` addon scans, or Playwright web extractions.
2. **Search Criteria Guarantee**: If an active guild trader listing exists in the database, any user searching via name or category filter MUST be able to view it instantly.
3. **ZOS TOS Compliance**: The in-game Lua addon (`ESOTrade.lua`) must strictly use official ESO API hooks (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). No memory manipulation, DLL injection, or direct network calls inside Lua.
4. **Data Pipeline Integrity**: The catalog consists of 155,476 authentic items from UESP. Dynamic queries must use parameterized SQL (`?` placeholders).

---

## 🔍 Subsystem Inspection Vectors & Protocols

Perform systematic static analysis and code reviews across the five key subsystems:

### 1. Backend API & Server (`backend/server.js`)
- **Authentication & Sessions**:
  - Check for hardcoded fallback tokens or test credentials seeded into SQLite tables in non-production environments.
  - Verify session token expiration, revocation on `/api/auth/logout`, and bcrypt password hashing.
  - Check for broken access control / IDOR (e.g., mutating endpoints silently defaulting to `userId = 1` or unauthenticated deletes).
- **Mutating Endpoint Guards**:
  - Verify that all data synchronization (`/api/prices/sync`, `/api/listings/sync`, `/api/characters/sync`, `/api/inventory/sync`, `/api/watchlist`) enforce authentication headers.
  - Check that development debugging endpoints (`/api/dev/*`) are strictly disabled in production.
- **Error Handling & Process Stability**:
  - Check for missing `pyProcess.on("error")` event listeners on spawned child processes.
  - Look for unhandled promise rejections in async route handlers and missing `process.on('unhandledRejection')` handlers.
  - Check for Express error handling middleware (`app.use((err, req, res, next) => ...)`).
- **Network & Middleware Configuration**:
  - Verify `dotenv` initialization at server startup.
  - Check rate limiting coverage across high-frequency and CPU-intensive scraping endpoints.
  - Check for HTTP security headers (`helmet`), `trust proxy` configuration, and CORS origin restrictions.

### 2. Python Data Pipeline (`backend/data-pipeline/*.py`)
- **Parsing & Lua Extractions** (`parse_esotrade_addon.py`, `live_trader_extractor.py`):
  - Check for regex parsing gaps on jewelry traits, weapon enchantments, quality ranks, and set names.
  - Look for silent exception swallowing (`except Exception: pass`) that hides network or parser failures.
  - Verify that SSL certificate verification is enabled on outbound network requests (`verify=True`).
- **Filesystem Daemon & Synchronization** (`watcher.py`, `auto_live_ingest.py`):
  - Check for race conditions when `SavedVariables/ESOTrade.lua` is being written concurrently by ESO.
  - Verify backoff and retry logic on API upload failures (`POST /api/market/upload-scans`).
  - Verify that auth tokens are passed via HTTP headers rather than URL query parameters.

### 3. Database Schema & Query Optimization (`eso_catalog.db`, `server.js`)
- **Relational Integrity & Indexes**:
  - Verify foreign key constraints are enabled (`PRAGMA foreign_keys = ON;`).
  - Check for missing composite indexes on frequent query paths (e.g., `guild_trader_listings(server, game_item_id)`).
  - Verify that all dynamic query builders use parameterized SQL (`?`) rather than template literal interpolation.
- **Listing TTL & Data Purging**:
  - Check that expired listings are purged on a regular schedule to prevent unbounded table growth.
  - Verify that schema migration statements and transaction rollbacks handle database lock errors properly.

### 4. Frontend UI & Client State (`frontend/src/`)
- **UI Logic & Consistency**:
  - Check for value index calculation alignment (e.g., "Deals Only" filter threshold matching "🔥 Deal" badge threshold).
  - Verify that dev-only buttons or admin modals (`DevAccountModal`) are not unconditionally exposed in production builds.
- **Routing & Client Resilience**:
  - Check for a catch-all 404 route (`<Route path="*" element={<NotFound />} />`).
  - Check for loading spinners and graceful error banners on failed API requests.
  - Verify session persistence strategy (migrating sensitive tokens from `localStorage` to HttpOnly cookies).

### 5. Dependencies, Build & CI/CD (`package.json`, `.github/`)
- **Dependency Hygiene**:
  - Check for redundant or unused packages (e.g., `body-parser` when `express.json()` is used).
  - Verify that all Python dependencies (`playwright`, `requests`) are documented in `requirements.txt`.
- **CI/CD Validation**:
  - Verify automated test coverage across PR and push events (`.github/workflows/ci.yml`).
  - Verify that `.env.example` templates exist and document all required variables.

---

## 📊 Severity Classification Schema

Group all discovered issues into the project's standardized four-tier severity matrix:

| Severity Tier | Definition | Examples |
|---|---|---|
| `🔴 [CRITICAL]` | Active security exploit, auth bypass, data corruption, process crash | Hardcoded admin tokens, unauthenticated DELETE/mutations, SQLi |
| `🟠 [MODERATE]` / `[HIGH]` | Core functional bug, missing error handler, data pipeline failure | ChildProcess unhandled error, silent upload failure, missing dotenv |
| `🟡 [MINOR]` / `[MEDIUM]` | UI/UX discrepancy, missing index, secondary security hardening | Deals threshold mismatch, missing 404 page, missing Helmet headers |
| `🔵 [NITPICK]` / `[LOW]` | Code cleanup, dead legacy code, minor config or doc gap | Redundant dependencies, unreferenced variables, doc formatting |

---

## 📋 Standardized User Output Format

When presenting scan results to the user, format findings cleanly using this exact structure:

```markdown
# 🔍 Codebase Maintenance & Security Audit Report

**Audit Target**: `ESO-Trade-Project`  
**Execution Mode**: Read-Only / Discovery  
**Total Findings**: <TotalCount> (<CriticalCount> Critical, <HighCount> High, <MediumCount> Medium, <LowCount> Low)

---

### 🔴 Critical (P0 — Immediate Security & Integrity Risks)

| # | Finding Title | Area | Severity | File Location | Strategic Rationale |
|:---:|:---|:---|:---:|:---|:---|
| **1** | <Title> | <Area> | `CRITICAL` | [`file.js:L10-L20`](file:///path/to/file.js#L10-L20) | <Explanation of root cause, risk, and suggested fix> |

---

### 🟠 High (P1 — Stability, Production Gaps & Major Bugs)

| # | Finding Title | Area | Severity | File Location | Strategic Rationale |
|:---:|:---|:---|:---:|:---|:---|
| **1** | <Title> | <Area> | `HIGH` | [`file.js:L10-L20`](file:///path/to/file.js#L10-L20) | <Explanation of root cause, risk, and suggested fix> |

---

### 🟡 Medium (P2 — UX Inconsistencies, DB Tuning & Hardening)

| # | Finding Title | Area | Severity | File Location | Strategic Rationale |
|:---:|:---|:---|:---:|:---|:---|
| **1** | <Title> | <Area> | `MODERATE` | [`file.jsx:L10-L20`](file:///path/to/file.jsx#L10-L20) | <Explanation of root cause, risk, and suggested fix> |

---

### 🔵 Low (P3 — Polish, Tech Debt & Tooling)

| # | Finding Title | Area | Severity | File Location | Strategic Rationale |
|:---:|:---|:---|:---:|:---|:---|
| **1** | <Title> | <Area> | `NITPICK` | [`file.js:L10-L20`](file:///path/to/file.js#L10-L20) | <Explanation of root cause, risk, and suggested fix> |

---

### 💡 Recommended Next Actions
Prompt the user to review the findings and ask which items they would like to file as GitHub issues via the `eso-trade-issue-creator` skill or prioritize into [Master Tracking Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35).
```
