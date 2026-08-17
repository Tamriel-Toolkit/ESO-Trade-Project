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
| **1** | #48 | Skills / Feat | FEAT | 🟡 Next Up | None | Creates read-only feature & UX opportunity scanner skill (.agents/skills/eso-trade-feature-scanner). |
| **2** | #28 | Backend / API | MODERATE | ⚪ Queued | None | Fixes duplicate `GET /api/characters` route definition shadowing character profile queries. |
| **3** | #29 | Pipeline / Py | MODERATE | ⚪ Queued | None | Removes dead legacy code block in `fetch_market_data.py` (lines 140-182). |
| **4** | #13 | Backend / Deps | MINOR | ⚪ Queued | None | Removes unused `body-parser` dependency from `backend/package.json`. |
| **5** | #18 | Frontend / Auth | NITPICK | ⚪ Queued | None | Implements full `Login.jsx` UI and connects to the hardened auth endpoints. |
| **6** | #17 | Frontend / UX | MINOR | ⚪ Queued | None | Improves WCAG text contrast ratios for dark theme legibility. |
| **7** | #37 | Frontend / UI | MINOR | ⚪ Queued | None | Auto-fits dropdown menu width in `EsoSelect` to accommodate full alliance names without truncation. |
| **8** | #8 | Core Milestone | FEATURE | 🔴 Blocked | #28 | Milestone Epic: Smart Build Importer & Market Deal Recommendation Engine. |
| **9** | #10 | Feature Plan | FEATURE | ⚪ Queued | None | Trait Research Tracker & Automated Kiosk Matching Engine. |
| **10** | #9 | Feature Plan | FEATURE | ⚪ Queued | None | Structured Public Crafting & WTB (Want-To-Buy) Request Board. |
| **11** | #16 | Config / Env | MINOR | ⚪ Queued | None | Adds documented `.env.example` file for backend and frontend. |
| **12** | #15 | Documentation | MINOR | ⚪ Queued | None | Expands root `README.md` with system overview, architecture, and getting-started guide. |
| **13** | #14 | Documentation | MINOR | ⚪ Queued | None | Fixes PostgreSQL references in `DatabaseSchema.md` to reflect SQLite 3. |
| **14** | #22 | Documentation | NITPICK | ⚪ Queued | None | Adds setup, watcher daemon, and ingestion guide in `backend/data-pipeline/README.md`. |
| **15** | #23 | Documentation | NITPICK | ⚪ Queued | None | Adds deployment guide and production configuration documentation. |
| **16** | #19 | Database / Perf | NITPICK | ⚪ Queued | None | Adds SQLite FTS5 Full-Text Search virtual table for sub-millisecond item catalog lookups. |
| **17** | #21 | Testing / QA | NITPICK | ⚪ Queued | None | Expands unit & integration test coverage across all Express endpoints and Python parsers. |

---

## 🏆 Recently Completed / Merged
- **`#47`** — `[FEAT] Create maintenance & repair code scanner skill (.agents/skills/eso-trade-maintenance-scanner)` (Resolved)
- **`#45`** — `[FEAT] Enforce PR squash-merge defaults and closing keyword automation across repository` (Resolved in PR #52)
- **`#44`** — `[FEAT] Add automated CI workflow for PRs and push validation (.github/workflows/ci.yml)` (Resolved)
- **`#43`** — `[MODERATE] Jewelry traits not extracted, mapped, or displayed for exported inventory and equipment items` (Resolved)
- **#30** — `[MODERATE] No rate limiting middleware on any API endpoint` (Merged in PR #46)
- **#32** — `[MODERATE] Hardcoded default password password123 in DevAccountModal` (Merged in PR #42)
- **#27** — `[CRITICAL] Gate or remove unauthenticated /api/dev/bypass-login endpoint` (Merged in PR #41)
- **#26** — `[CRITICAL] Remove hardcoded backdoor session tokens from production code` (Merged in PR #40)
- **#38** — `[FEAT] Automated GitHub Action to synchronize Master Tracking Issue #35 and PRIORITY_QUEUE.md on PR merge` (Merged in PR #39)
- **#25** — `[CRITICAL] Replace unsalted SHA-256 password hashing with bcrypt` (Merged in PR #36)
- **#20** — `[NITPICK] No automated expired listing TTL purge trigger in SQLite` (Merged in PR #34)
- **#24** — `[CRITICAL] Purge synthetic mock data generator and enforce 100% data authenticity` (Merged in PR #33)

---

## 🤖 Rules for Agents
1. When asked to **"work on the next task"** or **"start top of the queue"**, **always fetch [Master Tracking Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35) via `issue_read`**.
2. Locate the single item marked **`🟡 Next Up`** (Rank #1) and confirm no **Blocked By** prerequisite issues remain open.
3. Follow the issue resolution workflow in [`.agents/skills/eso-trade-issue-implementer/SKILL.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/skills/eso-trade-issue-implementer/SKILL.md).
4. Upon opening a Draft PR:
   - Update Master Tracking Issue #35 on GitHub (mark completed item as `🟢 In Review (PR #X)` and promote next unblocked item to `🟡 Next Up`).
   - Any items with unmerged prerequisites (`Blocked By`) MUST remain or be marked `🔴 Blocked`.
   - Do NOT edit `.agents/PRIORITY_QUEUE.md` inside feature branches (avoids merge conflicts).
