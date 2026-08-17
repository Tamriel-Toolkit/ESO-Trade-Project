# Contributing to ESO-Trade-Project

Thank you for contributing to **ESO-Trade-Project**! This document provides engineering standards, git workflow rules, maintainer merge procedures, and automation guidelines for all human contributors and autonomous AI agents.

---

## 🏛️ Inviolable Core Constraints

Before making any contribution, review the non-negotiable rules in [`.agents/AGENTS.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md):

1. **100% Data Authenticity**: Synthetic or hallucinated listings/guild names are strictly forbidden. All price and listing data must originate from official TTC `PriceTableNA.lua` archives, in-game `ESOTrade` addon scans, or Playwright web extractions.
2. **Search Criteria Guarantee**: If an active guild trader listing exists in the database, any user searching via name or category filter MUST be able to view it instantly.
3. **ZOS TOS Compliance**: The in-game Lua addon (`ESOTrade.lua`) must strictly use official ESO API hooks (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). No memory manipulation, DLL injection, or direct network calls inside Lua.
4. **Security & Parameterized SQL**: All SQLite database queries must use parameterized SQL (`?` placeholders). Hardcoded credentials or backdoor session tokens are strictly prohibited.

---

## 🔄 Development & Branching Workflow

We operate under a strict **Single Work-In-Progress (WIP = 1)** policy managed via [Master Tracking Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35) and [`.agents/PRIORITY_QUEUE.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/PRIORITY_QUEUE.md).

### 1. Pick the Active Work Item
- Always consult [Master Tracking Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35) to identify the single issue currently marked **`🟡 Next Up`** (Rank #1).
- Ensure no prerequisites are marked as `🔴 Blocked`.

### 2. Branch Naming Convention
Always create a dedicated feature or bugfix branch off `main`:
- `feat/issue-<N>-<short-description>` for new features
- `fix/issue-<N>-<short-description>` for bugfixes and security hardening
- `docs/issue-<N>-<short-description>` for documentation updates

```bash
git checkout main
git pull origin main
git checkout -b feat/issue-45-pr-templates-squash-merge
```

---

## 📝 Submitting Issues & Backlog Triage

All issues filed against **ESO-Trade-Project** (whether by human contributors or automated agent tools) must follow standardized severity prefixes and structure. Use the interactive issue forms available in GitHub:

- 🐛 [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml)
- 💡 [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml)
- 🔒 [Security Vulnerability](.github/ISSUE_TEMPLATE/security_vulnerability.yml)

### 1. Title & Severity Taxonomy
Every issue title must begin with an appropriate severity prefix:

| Prefix | Severity Category | Example Scenario |
|---|---|---|
| `[CRITICAL]` | Security vulnerability, data loss, crash, ZOS TOS breach | Plaintext passwords, backdoor tokens, SQL injections |
| `[MODERATE]` | Core functional bug, shadowed route, API contract break | Ingestion parser exception, duplicate route handler |
| `[MINOR]` | Secondary bug, contrast issue, minor config gap | Missing `.env.example`, unused dependency |
| `[NITPICK]` | Code cleanup, logging formatting, style tweak | Comment spelling, unused variable, dead code |
| `[FEAT]` | New feature or architectural enhancement | New pricing algorithm, UI filter modal, FTS search |

### 2. Backlog Placement & Prioritization
Once an issue is created, it is evaluated and added to [Master Tracking Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35):
1. **Tier 1 (Critical Security & Data Integrity)**: Top of backlog (`Ranks 1–6`).
2. **Tier 2 (Core Backend & Ingestion Pipeline)**: Middle backlog (`Ranks 7–10`).
3. **Tier 3 (UI & User Experience)**: Queued behind core backend dependencies.
4. **Tier 4 (Milestones & Feature Epics)**: Ordered chronologically by architectural phase.
5. **Tier 5 (Documentation & Nitpicks)**: Background queue.

---

## 📬 Pull Request Guidelines & Closing Keywords

### 1. Mandatory Issue Linking
All Pull Requests must use the repository template ([`.github/PULL_REQUEST_TEMPLATE.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.github/PULL_REQUEST_TEMPLATE.md)). The PR description **must** include an official GitHub closing keyword linking the issue:

```markdown
Closes #45
# Or: Fixes #45, Resolves #45
```

### 2. PR Verification Checklist
Before submitting a PR, ensure all relevant test suites execute cleanly:
- **Backend API**: `cd backend && node server.js`
- **Frontend UI**: `cd frontend && npm run build`
- **Data Pipeline**: `cd backend/data-pipeline && python test_db_queries.py`

---

## 🔀 Maintainer Merge Guidelines (Squash & Merge)

To maintain a clean, linear git history on `main` and ensure GitHub's automated closing keywords resolve tracked issues, maintainers should adhere to the following merge rules:

### 1. Default to **"Squash and merge"**
- On the GitHub Pull Request page, select **"Squash and merge"**.
- Do **not** use "Create a merge commit" or "Rebase and merge" unless explicitly required for multi-author attribution.

```
┌────────────────────────────────────────────────────────┐
│  Squash and merge                                      ▼│
│  The commits from this branch will be combined into    │
│  one commit in the base branch.                        │
└────────────────────────────────────────────────────────┘
```

### 2. Preserve Issue Closing Keywords in Merge Commit
When prompted for the squash commit title and body on GitHub:
- Ensure the commit title matches: `type(#<N>): <PR Title> (#<PR_NUMBER>)`
- Ensure the commit message body includes `Closes #<N>` or `Fixes #<N>`.

### 3. Automated Queue Synchronization
When a PR with closing keywords is squash-merged into `main`:
1. GitHub automatically transitions the linked issue `#<N>` to **Closed**.
2. GitHub Action [`.github/workflows/sync-priority-queue.yml`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.github/workflows/sync-priority-queue.yml) fires automatically.
3. The script [`.agents/scripts/sync_priority_queue.js`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/scripts/sync_priority_queue.js):
   - Moves `#<N>` to the **🏆 Recently Completed / Merged** archive.
   - Evaluates downstream dependencies and unblocks any `🔴 Blocked` items.
   - Automatically promotes the next available `⚪ Queued` item to **`🟡 Next Up`** (maintaining `WIP = 1`).
   - Updates both [Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35) on GitHub and [`.agents/PRIORITY_QUEUE.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/PRIORITY_QUEUE.md) on `main`.

---

## 🧪 Testing Reference

| Area | Test Command | Expected Result |
|---|---|---|
| **Backend Express API** | `cd backend && node data-pipeline/test_api_endpoints.js` | All endpoint requests return 200 OK |
| **Frontend React Build** | `cd frontend && npm run build` | Zero JSX/CSS errors, clean Vite bundle in `dist/` |
| **SQLite Schema & Queries** | `cd backend/data-pipeline && python test_db_queries.py` | Query benchmarks execute within latency bounds |
| **Listing Expiration Daemon**| `cd backend/data-pipeline && python test_ttl_purge.py` | 30d TTL purge triggers execute correctly |
