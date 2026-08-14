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
| **1** | `#26` | Security / Auth | CRITICAL | 🟡 Next Up | None | Eliminates hardcoded backdoor session tokens from production code. |
| **2** | `#27` | Security / API | CRITICAL | ⚪ Queued | None | Restricts `/api/dev/bypass-login` to non-production environments (`NODE_ENV !== 'production'`). |
| **3** | `#32` | Security / UI | MODERATE | ⚪ Queued | None | Removes hardcoded `password123` defaults from `DevAccountModal.jsx`. |
| **4** | `#30` | Security / API | MODERATE | ⚪ Queued | None | Adds express-rate-limit middleware on auth and search routes. |
| **5** | `#31` | Security / DB | MODERATE | ⚪ Queued | None | Moves in-memory session Map to SQLite persistent store or signed tokens. (Prereq #25 in review) |
| **6** | `#28` | Backend / API | MODERATE | ⚪ Queued | None | Fixes duplicate `GET /api/characters` route definition shadowing character profile queries. |
| **7** | `#29` | Pipeline / Py | MODERATE | ⚪ Queued | None | Removes dead legacy code block in `fetch_market_data.py` (lines 140-182). |
| **8** | `#13` | Backend / Deps | MINOR | ⚪ Queued | None | Removes unused `body-parser` dependency from `backend/package.json`. |
| **9** | `#18` | Frontend / Auth | NITPICK | ⚪ Queued | `#27` | Implements full `Login.jsx` UI and connects to the hardened auth endpoints. |
| **10** | `#17` | Frontend / UX | MINOR | ⚪ Queued | None | Improves WCAG text contrast ratios for dark theme legibility. |
| **11** | `#8` | Core Milestone | FEATURE | ⚪ Queued | `#28` | Milestone Epic: Smart Build Importer & Market Deal Recommendation Engine. |
| **12** | `#10` | Feature Plan | FEATURE | ⚪ Queued | None | Trait Research Tracker & Automated Kiosk Matching Engine. |
| **13** | `#9` | Feature Plan | FEATURE | ⚪ Queued | None | Structured Public Crafting & WTB (Want-To-Buy) Request Board. |
| **14** | `#16` | Config / Env | MINOR | ⚪ Queued | None | Adds documented `.env.example` file for backend and frontend. |
| **15** | `#15` | Documentation | MINOR | ⚪ Queued | None | Expands root `README.md` with system overview, architecture, and getting-started guide. |
| **16** | `#14` | Documentation | MINOR | ⚪ Queued | None | Fixes PostgreSQL references in `DatabaseSchema.md` to reflect SQLite 3. |
| **17** | `#22` | Documentation | NITPICK | ⚪ Queued | None | Adds setup, watcher daemon, and ingestion guide in `backend/data-pipeline/README.md`. |
| **18** | `#23` | Documentation | NITPICK | ⚪ Queued | None | Adds deployment guide and production configuration documentation. |
| **19** | `#19` | Database / Perf | NITPICK | ⚪ Queued | None | Adds SQLite FTS5 Full-Text Search virtual table for sub-millisecond item catalog lookups. |
| **20** | `#21` | Testing / QA | NITPICK | ⚪ Queued | None | Expands unit & integration test coverage across all Express endpoints and Python parsers. |
| — | `#25` | Security / Auth | CRITICAL | 🟢 In Review (PR #36) | None | Replaces unsalted SHA-256 with bcrypt salt+hash. Foundation for secure user accounts. |

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

