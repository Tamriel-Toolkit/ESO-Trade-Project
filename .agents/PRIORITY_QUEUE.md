# 📌 ESO Trade Project — Central Agent Task & Issue Execution Queue

> **Live Status**: Canonical Roadmap & Priority Matrix  
> **Master Tracking Issue on GitHub**: [Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35)  
> **Repository Rules**: [.agents/AGENTS.md](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md)  
> **Last Evaluated**: 2026-08-13  

This living document provides the prioritized execution queue for both human maintainers and autonomous AI agents. Whenever an issue is created or resolved, this document and GitHub Issue #35 are updated in synchronization.

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
| **1** | `#25` | Security / Auth | CRITICAL | 🟡 Next Up | None | Replaces unsalted SHA-256 with bcrypt salt+hash. Foundation for secure user accounts. |
| **2** | `#26` | Security / Auth | CRITICAL | ⚪ Queued | None | Eliminates hardcoded backdoor session tokens from production code. |
| **3** | `#27` | Security / API | CRITICAL | ⚪ Queued | None | Restricts `/api/dev/bypass-login` to non-production environments (`NODE_ENV !== 'production'`). |
| **4** | `#32` | Security / UI | MODERATE | ⚪ Queued | None | Removes hardcoded `password123` defaults from `DevAccountModal.jsx`. |
| **5** | `#30` | Security / API | MODERATE | ⚪ Queued | None | Adds express-rate-limit middleware on auth and search routes. |
| **6** | `#31` | Security / DB | MODERATE | ⚪ Queued | `#25` | Moves in-memory session Map to SQLite persistent store or signed tokens. |
| **7** | `#28` | Backend / API | MODERATE | ⚪ Queued | None | Fixes duplicate `GET /api/characters` route definition shadowing character profile queries. |
| **8** | `#29` | Pipeline / Py | MODERATE | ⚪ Queued | None | Removes dead legacy code block in `fetch_market_data.py` (lines 140-182). |
| **9** | `#13` | Backend / Deps | MINOR | ⚪ Queued | None | Removes unused `body-parser` dependency from `backend/package.json`. |
| **10** | `#18` | Frontend / Auth | NITPICK | ⚪ Queued | `#25`, `#27` | Implements full `Login.jsx` UI and connects to the hardened auth endpoints. |
| **11** | `#17` | Frontend / UX | MINOR | ⚪ Queued | None | Improves WCAG text contrast ratios for dark theme legibility. |
| **12** | `#8` | Core Milestone | FEATURE | ⚪ Queued | `#25`, `#28` | Milestone Epic: Smart Build Importer & Market Deal Recommendation Engine. |
| **13** | `#10` | Feature Plan | FEATURE | ⚪ Queued | None | Trait Research Tracker & Automated Kiosk Matching Engine. |
| **14** | `#9` | Feature Plan | FEATURE | ⚪ Queued | None | Structured Public Crafting & WTB (Want-To-Buy) Request Board. |
| **15** | `#16` | Config / Env | MINOR | ⚪ Queued | None | Adds documented `.env.example` file for backend and frontend. |
| **16** | `#15` | Documentation | MINOR | ⚪ Queued | None | Expands root `README.md` with system overview, architecture, and getting-started guide. |
| **17** | `#14` | Documentation | MINOR | ⚪ Queued | None | Fixes PostgreSQL references in `DatabaseSchema.md` to reflect SQLite 3. |
| **18** | `#22` | Documentation | NITPICK | ⚪ Queued | None | Adds setup, watcher daemon, and ingestion guide in `backend/data-pipeline/README.md`. |
| **19** | `#23` | Documentation | NITPICK | ⚪ Queued | None | Adds deployment guide and production configuration documentation. |
| **20** | `#19` | Database / Perf | NITPICK | ⚪ Queued | None | Adds SQLite FTS5 Full-Text Search virtual table for sub-millisecond item catalog lookups. |
| **21** | `#21` | Testing / QA | NITPICK | ⚪ Queued | None | Expands unit & integration test coverage across all Express endpoints and Python parsers. |

---

## 🏆 Recently Completed / Merged
- **`#20`** — `[NITPICK] No automated expired listing TTL purge trigger in SQLite` (Merged in PR #34)
- **`#24`** — `[CRITICAL] Purge synthetic mock data generator and enforce 100% data authenticity` (Merged in PR #33)

---

## 🤖 Rules for Agents
1. When asked to **"work on the next task"** or **"start top of the queue"**, look for the single item marked **`🟡 Next Up`** (Rank #1).
2. Confirm no **Blocked By** prerequisite issues remain open.
3. Follow the issue resolution workflow in [`.agents/skills/eso-trade-issue-implementer/SKILL.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/skills/eso-trade-issue-implementer/SKILL.md).
4. Upon opening a Draft PR:
   - Mark the completed item as `🟢 In Review (PR #X)`
   - Promote the next unblocked item from `⚪ Queued` $\rightarrow$ `🟡 Next Up`
   - Update Master Tracking Issue #35 and this file.
