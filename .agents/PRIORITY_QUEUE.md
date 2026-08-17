# 📌 ESO Trade Project — Central Agent Task & Issue Execution Queue

> **Live Status**: Canonical Roadmap & Priority Matrix  
> **Master Tracking Issue on GitHub (Live Single Source of Truth)**: [Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35)  
> **Repository Rules**: [.agents/AGENTS.md](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md)  
> **Last Evaluated**: 2026-08-17  

This living document provides the prioritized execution queue for both human maintainers and autonomous AI agents. Whenever an issue is created or resolved, GitHub Issue #35 (the live runtime SSOT) and this document are updated.

---

## 🚦 Status Legend (Strict Single WIP Policy)

| Status | Meaning | Permitted Count | Action Required |
|:---:|:---|:---:|:---|
| `🟡 Next Up` | **Active Work Item** (Rank #1) | **Exactly 1** | The only task an agent should pick when starting work. |
| `⚪ Queued` | Unblocked & ready in backlog | Multiple | Waiting in sequence behind Rank #1. |
| `🔴 Blocked` | Blocked by a prerequisite issue | Multiple | Do NOT start until prerequisite issue is resolved. |
| `🟢 In Review (PR #X)` | Implementation complete, PR open | Multiple | Waiting for maintainer review & merge. |
| `✅ Closed` | Merged and resolved | Multiple | Archived in Recently Completed. |

---

## 🚦 Live Execution Matrix

| Rank | Issue | Area | Severity | Status | Blocked By | Strategic Rationale |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| **1** | #62 | Backend / Stability | MODERATE | 🟡 Next Up | None | Handles child process error event in scraper endpoint to prevent server crashes. |
| **2** | #61 | Backend / Config | MODERATE | ⚪ Queued | None | Adds dotenv dependency and loader to backend server initialization. |
| **3** | #60 | Frontend / UI | MODERATE | ⚪ Queued | None | Gates DEV-Only Clear Listings button from production Marketplace UI. |
| **4** | #63 | Backend / Security | MODERATE | ⚪ Queued | None | Implements input validation and sanitization on authentication endpoints. |
| **5** | #64 | Pipeline / Security | MODERATE | ⚪ Queued | None | Restores SSL certificate and hostname verification in live trader extractor. |
| **6** | #65 | Backend / Stability | MODERATE | ⚪ Queued | None | Adds global unhandledRejection and graceful shutdown handlers in server.js. |
| **7** | #66 | Backend / Perf | MODERATE | ⚪ Queued | None | Dedicated rate limiting and single-flight lock for live scraper extraction endpoint. |
| **8** | #29 | Pipeline / Py | MODERATE | ⚪ Queued | None | Removes dead legacy code block in `fetch_market_data.py` (lines 140-182). |
| **9** | #69 | Database / Perf | MODERATE | ⚪ Queued | None | Adds composite database indexes on guild_trader_listings for megaserver filtering. |
| **10** | #71 | Frontend / Security | MODERATE | ⚪ Queued | None | Migrates frontend session token storage to HttpOnly SameSite cookies. |
| **11** | #72 | Backend / Security | MODERATE | ⚪ Queued | None | Adds helmet middleware for HTTP security headers and CSP protection. |
| **12** | #73 | Backend / API | MODERATE | ⚪ Queued | None | Adds batch size limits and numeric range validation on market and price uploads. |
| **13** | #67 | Frontend / UX | MINOR | ⚪ Queued | None | Synchronizes Deals Only filter threshold with Deal badge calculation in Marketplace UI. |
| **14** | #68 | Frontend / UX | MINOR | ⚪ Queued | None | Adds catch-all 404 route and themed NotFound page in React Router. |
| **15** | #13 | Backend / Deps | MINOR | ⚪ Queued | None | Removes unused `body-parser` dependency from `backend/package.json`. |
| **16** | #18 | Frontend / Auth | NITPICK | ⚪ Queued | None | Implements full `Login.jsx` UI and connects to the hardened auth endpoints. |
| **17** | #17 | Frontend / UX | MINOR | ⚪ Queued | None | Improves WCAG text contrast ratios for dark theme legibility. |
| **18** | #37 | Frontend / UI | MINOR | ⚪ Queued | None | Auto-fits dropdown menu width in `EsoSelect` to accommodate full alliance names without truncation. |
| **19** | #8 | Core Milestone | FEATURE | ⚪ Queued | None | Milestone Epic: Smart Build Importer & Market Deal Recommendation Engine. |
| **20** | #10 | Feature Plan | FEATURE | ⚪ Queued | None | Trait Research Tracker & Automated Kiosk Matching Engine. |
| **21** | #9 | Feature Plan | FEATURE | ⚪ Queued | None | Structured Public Crafting & WTB (Want-To-Buy) Request Board. |
| **22** | #82 | Feature Plan | FEATURE | ⚪ Queued | None | Saved search presets sidebar & quick-filter drawer for authenticated users in Marketplace UI. |
| **23** | #16 | Config / Env | MINOR | ⚪ Queued | None | Adds documented `.env.example` file for backend and frontend. |
| **24** | #74 | Pipeline / Deps | MINOR | ⚪ Queued | None | Adds playwright to backend/data-pipeline/requirements.txt. |
| **25** | #76 | Backend / Config | MINOR | ⚪ Queued | None | Configures trust proxy setting for express rate limiters behind reverse proxies. |
| **26** | #77 | Backend / Config | MINOR | ⚪ Queued | None | Expands CORS configuration to support multiple origins and dynamic local network testing. |
| **27** | #78 | Backend / Security | MINOR | ⚪ Queued | None | Deprecates legacy unsalted SHA-256 password fallback in favor of strict bcrypt verification. |
| **28** | #70 | Backend / DB | NITPICK | ⚪ Queued | None | Handles and logs schema migration and transaction rollback errors. |
| **29** | #75 | Pipeline / Logging | NITPICK | ⚪ Queued | None | Logs network and parsing exceptions in live trader extractor instead of silent pass. |
| **30** | #79 | Frontend / Infra | NITPICK | ⚪ Queued | None | Adds standard start script to frontend/package.json for production deployment. |
| **31** | #80 | Frontend / QA | NITPICK | ⚪ Queued | None | Configures Vitest and React Testing Library for frontend component unit tests. |
| **32** | #15 | Documentation | MINOR | ⚪ Queued | None | Expands root `README.md` with system overview, architecture, and getting-started guide. |
| **33** | #14 | Documentation | MINOR | ⚪ Queued | None | Fixes PostgreSQL references in `DatabaseSchema.md` to reflect SQLite 3. |
| **34** | #22 | Documentation | NITPICK | ⚪ Queued | None | Adds setup, watcher daemon, and ingestion guide in `backend/data-pipeline/README.md`. |
| **35** | #23 | Documentation | NITPICK | ⚪ Queued | None | Adds deployment guide and production configuration documentation. |
| **36** | #19 | Database / Perf | NITPICK | ⚪ Queued | None | Adds SQLite FTS5 Full-Text Search virtual table for sub-millisecond item catalog lookups. |
| **37** | #21 | Testing / QA | NITPICK | ⚪ Queued | None | Expands unit & integration test coverage across all Express endpoints and Python parsers. |

---

## 🏆 Recently Completed / Merged
- **`#57`** — `[CRITICAL] Broken Access Control & IDOR: Unauthenticated mutations default to User 1 and arbitrary deletions allowed` (Resolved)
- **`#84`** — `[MODERATE] Equipment and marketplace item icons failing to render due to raw DDS texture format` (Resolved)
- **`#58`** — `[CRITICAL] Protect unauthenticated state-modifying sync and watchlist mutation endpoints` (Resolved)
- **`#59`** — `[CRITICAL] Gate dev bypass and destructive user management endpoints behind strict admin guards` (Resolved)
- **`#56`** — `[CRITICAL] Hardcoded dev session tokens seeded in SQLite and Python fallback` (Merged in PR #81)
- **`#28`** — `[MODERATE] Duplicate GET /api/characters route definition in server.js` (Merged in PR #55)
- **`#48`** — `[FEAT] Create feature & enhancement opportunity scanner skill` (Merged in PR #54)
- **`#47`** — `[FEAT] Create maintenance & repair code scanner skill` (Merged in PR #53)
- **`#45`** — `[FEAT] Enforce PR squash-merge defaults and closing keyword automation across repository` (Merged in PR #52)
- **`#44`** — `[FEAT] Add automated CI workflow for PRs and push validation` (Merged in PR #51)
- **`#43`** — `[MODERATE] Jewelry traits not extracted, mapped, or displayed for exported inventory and equipment items` (Merged in PR #50)
- **`#31`** — `[MODERATE] In-memory session store replaced with SQLite persistent sessions` (Merged in PR #49)
- **`#30`** — `[MODERATE] No rate limiting middleware on any API endpoint` (Merged in PR #46)
- **`#32`** — `[MODERATE] Hardcoded default password password123 in DevAccountModal` (Merged in PR #42)
- **`#27`** — `[CRITICAL] Gate or remove unauthenticated /api/dev/bypass-login endpoint` (Merged in PR #41)
- **`#26`** — `[CRITICAL] Remove hardcoded backdoor session tokens from production code` (Merged in PR #40)
- **`#38`** — `[FEAT] Automated GitHub Action to synchronize Master Tracking Issue #35 and PRIORITY_QUEUE.md on PR merge` (Merged in PR #39)
- **`#25`** — `[CRITICAL] Replace unsalted SHA-256 password hashing with bcrypt` (Merged in PR #36)
- **`#20`** — `[NITPICK] No automated expired listing TTL purge trigger in SQLite` (Merged in PR #34)
- **`#24`** — `[CRITICAL] Purge synthetic mock data generator and enforce 100% data authenticity` (Merged in PR #33)
- **`#7`** — `[FEAT] Interactive Character Profile & Anatomical Equipment Diagram Page` (Closed)

---

## 🤖 Rules for Agents
1. When asked to **"work on the next task"** or **"start top of the queue"**, **always fetch [Master Tracking Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35) via `issue_read`**.
2. Locate the single item marked **`🟡 Next Up`** (Rank #1) and confirm no **Blocked By** prerequisite issues remain open.
3. Follow the issue resolution workflow in [`.agents/skills/eso-trade-issue-implementer/SKILL.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/skills/eso-trade-issue-implementer/SKILL.md).
4. Upon opening a Draft PR:
   - Update Master Tracking Issue #35 on GitHub (mark completed item as `🟢 In Review (PR #X)` and promote next unblocked item to `🟡 Next Up`).
   - Any items with unmerged prerequisites (`Blocked By`) MUST remain or be marked `🔴 Blocked`.
   - Do NOT edit `.agents/PRIORITY_QUEUE.md` inside feature branches (avoids merge conflicts).
