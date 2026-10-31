# 📌 ESO Trade Project — Central Agent Task & Issue Execution Queue

> **Live Status**: Canonical Roadmap & Priority Matrix  
> **Master Tracking Issue on GitHub (Live Single Source of Truth)**: [Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35)  
> **Repository Rules**: [.agents/AGENTS.md](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md)  
> **Last Evaluated**: 2026-10-31

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
| **1** | #166 | Web / API Configuration | MODERATE | 🟡 Next Up | None | Fix the browser deployment contract before containerizing the web app. |
| **2** | #164 | Database / Concurrency | MODERATE | ⚪ Queued | None | Own complete transactions and establish WAL/durability before increasing production concurrency. |
| **3** | #165 | Data / Authenticity | MODERATE | ⚪ Queued | None | Ensure the public web app starts from authentic catalog data, never fixture bootstrap. |
| **4** | #167 | Security / Sessions | MODERATE | 🔴 Blocked | #166 | Define secure public-browser authentication and least-privilege ingestion access. |
| **5** | #168 | Database / Migrations | MODERATE | 🔴 Blocked | #164, #165 | Make production schema evolution atomic, traceable and safely adopt existing data. |
| **6** | #169 | Infrastructure / Web Deployment | FEAT | 🔴 Blocked | #166, #165, #167 | Deploy the product as a browser web app with durable server storage and controlled ingress. |
| **7** | #170 | CI / Supply Chain | MINOR | ⚪ Queued | None | Make release artifacts reproducible and test the runtime actually deployed. |
| **8** | #171 | Operations / Recovery | MODERATE | 🔴 Blocked | #164, #168, #169 | Prove recoverability of user data and native market state before launch. |
| **9** | #172 | Operations / Observability | MODERATE | 🔴 Blocked | #164, #168, #169 | Expose real readiness and actionable failures before traffic is admitted. |
| **10** | #173 | API / Resource Protection | MODERATE | 🔴 Blocked | #172 | Bound public-facing CPU, download and storage amplification. |
| **11** | #174 | Web / Account Lifecycle | FEAT | 🔴 Blocked | #167, #168 | Give public web users a secure recovery path without developer access. |
| **12** | #175 | Security / User Operations | FEAT | 🔴 Blocked | #167, #168 | Provide accountable privacy and abuse handling for a public user-generated-content web app. |
| **13** | #176 | Web / Asset Caching | MINOR | 🔴 Blocked | #166, #169, #173 | Cache immutable local bytes safely and preserve recovery from missing upstream icons. |
| **14** | #177 | Frontend / Resilience | MINOR | ⚪ Queued | None | Prevent a rendering exception from leaving the public web app blank. |
| **15** | #178 | Frontend / Sharing | MINOR | 🔴 Blocked | #166, #167, #169, #175 | Support safe web deep links and previews without requiring desktop UI or unrelated social features. |
| **16** | #179 | QA / Performance and Integrity | MODERATE | 🔴 Blocked | #164, #165, #169, #172, #173, #176 | Make completeness and measured performance explicit web launch gates. |
| **17** | #180 | Ingestion / Offline Reliability | MODERATE | 🔴 Blocked | #167, #168 | Reliably feed the web marketplace from native player-side observations. |
| **18** | #185 | Accounts / Native Characters | FEAT | 🔴 Blocked | #167, #168, #180 | Require explicit ESO account names and securely paired automatic rosters before companion onboarding and public launch. |
| **19** | #181 | Ingestion / Windows Companion | FEAT | 🔴 Blocked | #180, #167, #170, #185 | Provide a usable and trustworthy scan contributor companion while keeping the product web-based. |
| **20** | #14 | Database / Docs | MINOR | 🔴 Blocked | #165, #168, #185 | Documents the complete current SQLite schema, constraints, indexes, triggers, and migration rules. |
| **21** | #15 | Documentation | MINOR | 🔴 Blocked | #166, #169, #174, #181 | Provides accurate onboarding for the current catalog, native addon, API, frontend, and icon architecture. |
| **22** | #22 | Pipeline / Docs | MINOR | 🔴 Blocked | #165, #180, #181, #167 | Makes catalog and native-addon ingestion reproducible and supportable from a clean environment. |
| **23** | #23 | Deployment / Docs | MINOR | 🔴 Blocked | #169, #168, #171, #172, #179 | Defines a supported production topology with persistent SQLite, icon caching, backups, and monitoring. |
| **24** | #182 | Release / Production Gate | FEAT | 🔴 Blocked | #164, #165, #166, #167, #168, #169, #170, #171, #172, #173, #174, #175, #176, #177, #178, #179, #180, #181, #14, #15, #22, #23, #185 | Final release sign-off after security, recovery, capacity, browser UX and contributor onboarding are proven. |
| **25** | #103 | Requests / Messaging | FEATURE | ⚪ Queued | None | Adds authorized order-specific buyer and crafter communication after core stability work. |
| **26** | #120 | UI / Home | MINOR | ⚪ Queued | None | Clear product introduction and compact category discovery. |
| **27** | #121 | UI / Market Search | MINOR | ⚪ Queued | None | Readable search, refinement, sorting, and saved-search hierarchy. |
| **28** | #122 | UI / Market Listings | MINOR | ⚪ Queued | None | Clear item, price, stack, trader, and observation presentation. |
| **29** | #147 | UI / Builds and Requests | FEATURE | ⚪ Queued | None | Scalable build library and request ledger: complete pagination, true set search, accessible summaries and restorable browsing; coordinate #123, #124 and #126. |
| **30** | #123 | UI / Request Pages | MINOR | ⚪ Queued | None | Compact and consistent public and personal request pages. |
| **31** | #124 | UI / Request Cards | MINOR | ⚪ Queued | None | Readable specifications, offers, statuses, and role-specific actions. |
| **32** | #125 | UI / Request Form | MINOR | ⚪ Queued | None | Consistent item selection and request form presentation. |
| **33** | #126 | UI / Build Gallery | MINOR | ⚪ Queued | None | Scannable build identity, metadata, and existing actions. |
| **34** | #127 | UI / Build Details | MINOR | ⚪ Queued | None | Readable equipment, comparison metrics, and recorded-price context. |
| **35** | #128 | UI / Build Form | MINOR | ⚪ Queued | None | Coherent equipment editor and nested set picker styling. |
| **36** | #129 | UI / Characters | MINOR | 🔴 Blocked | #185 | Present the paired/imported roster and compact shared equipment after account identity changes. |
| **37** | #130 | UI / Trait Research | MINOR | ⚪ Queued | None | Legible research status and accurate matching-listing labels. |
| **38** | #131 | UI / Auth and Utility | MINOR | 🔴 Blocked | #185 | Polish required ESO-account signup, authentication and utility surfaces after account identity changes. |
| **39** | #142 | UI / Appearance | FEATURE | ⚪ Queued | None | Adds accessible light and OS-following themes after shared tokens and core UI acceptance, before social feature expansion. |
| **40** | #106 | Builds / Social | FEATURE | ⚪ Queued | None | Adds secure build visibility, derived bookmarks, and private-by-default community forks. |
| **41** | #105 | Profiles / Privacy | FEATURE | ⚪ Queued | None | Delivers a privacy-conscious profile MVP before reputation or public contact features. |
| **42** | #110 | Reputation / Safety | FEATURE | 🔴 Blocked | #105 | Adds verified post-trade reputation only with moderation, privacy, and anti-abuse safeguards. |

---

## 🌐 Public web production-readiness program

**Product:** browser-based React/Vite web app with an Express/SQLite service. The standalone Windows watcher is a player-side native scan contributor companion, not a desktop marketplace or server-side game process.

**Milestone:** [Public web launch readiness](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/milestone/1). **Launch acceptance:** #182. **Completed authorization prerequisite:** #162 (merged in PR #184). **Sole Next Up:** #163. Each issue contains concrete acceptance criteria and bidirectional dependency references; the matrix remains the execution source of truth. Phase grouping describes delivery outcomes; cross-cutting security and test-safety prerequisites run first where required.

| Phase | Required work | Evidence before progressing |
|:---|:---|:---|
| 1 — Infrastructure and web foundations | #162, #163, #165, #166, #167, #169, #170 | Authorization fix, safe tests, authentic bootstrap, correct browser API origin, scoped sessions, reproducible HTTPS topology and release pipeline. |
| 2 — Data durability and migrations | #164, #168, #171, #14 | Transaction ownership/WAL, validated migration ledger, off-host backups and a timed fresh-host restore. |
| 3 — Observability, security and web resilience | #172, #173, #174, #175, #176, #177, #178, #179 | Real readiness/alerts, bounded resources, recovery/privacy operations, local caching, error containment, safe previews and measured completeness/capacity. |
| 4 — Native contributor onboarding and launch acceptance | #180, #185, #181, #182, #15, #22, #23 | Explicit ESO-account signup, paired automatic character roster, signed companion, durable offline capture, end-to-end native observation to browser search, verified operator/user docs and recorded release decision. |

**Required documentation owners:** #14 (schema), #15 (onboarding), #22 (pipeline/companion) and #23 (deployment/recovery/operations). These existing issues are reused and linked to their actual implementation dependencies.

**Existing optional enhancement backlog:** #103, #105, #106, #110, #119–#131, #142 and #147 retain their approved scopes. They are not automatically all required to launch. Existing user-facing routes must pass #182 usability/security checks; unready new features stay disabled. #119 coordinates the persistent shell with #177; #106/#147 coordinate detail/visibility behavior with #178. No closed/merged work is revived. #185 owns required ESO-account signup, pairing and imported-roster behavior; #129/#131 polish that resulting baseline and must not retain manual character creation or optional-handle requirements.

**Invariant gates:** authentic catalog/native observations only; Id64 decimal strings end-to-end; committed matching listings remain discoverable immediately; no removal by scan absence; local browser icons; official Lua hooks only. Production load fixtures remain isolated.

---

## 🏆 Recently Completed / Merged
- **`#163`** — `[MODERATE] Isolate password tests from server startup and configured databases` (Closed/Merged)
- **`#162`** — `[CRITICAL] Prevent legacy scan uploads from reassigning character ownership` (Closed/Merged)
- **`#119`** — `[MINOR] Refine navigation, settings, and account menus into a coherent application shell` (Closed/Merged)
- **`#104`** — `[FEAT] Establish Tailwind v4 design tokens and incrementally migrate core UI` (Closed/Merged)
- **`#144`** — `[FEAT] Validate feasibility of trustworthy full-trader absence reconciliation` (Closed/Merged)
- **`#100`** — `[FEAT] Complete bidirectional deep-linked Marketplace filter state` (Closed/Merged)
- **`#118`** — `[FEAT] Implement evidence-based guild trader listing lifecycle and purchase removals` (Closed/Merged)
- **`#21`** — `[MODERATE] Expand backend and data-pipeline regression coverage for the current architecture` (Closed/Merged)
- **`#138`** — `[MODERATE] Unit price integer rounding discards true stack listing price and inflates marketplace totals` (Closed/Merged)
- **`#134`** — `[MODERATE] Correct marketplace trait capture, mappings, and filtering` (Closed/Merged)
- **`#132`** — `[FEAT] Establish a bespoke ESO-inspired visual identity and restyle the entire web app` (Closed/Completed via PR #133)
- **`#80`** — `[NITPICK] Configure Vitest and React Testing Library for frontend component unit tests` (Closed/Completed)
- **`#76`** — `[MODERATE] Configure topology-safe Express proxy trust and client IP rate limiting` (Closed/Merged)
- **`#16`** — `[MINOR] Add complete backend and frontend environment configuration examples` (Closed/Merged)
- **`#111`** — `[MODERATE] Repair priority queue mirror sync failures after issue closure events` (Closed/Merged)
- **`#133`** — `Gilded Exchange restyle, ESO Marketplace rename, and catalog browsing retirement` (PR #133 Merged)
- **`#70`** — `[MODERATE] Make schema migrations and transaction rollbacks observable and failure-safe` (Closed/Merged)
- **`#115`** — `[MODERATE] Commit native parser SQLite synchronization before reporting success` (Closed/Merged)
- **`#113`** — `[MODERATE] Prevent ESOTrade watcher self-trigger loop and empty resync storm` (Closed/Merged)
- **`#78`** — `[CRITICAL] Remove legacy SHA-256 password verification and reset remaining legacy accounts` (Closed/Merged)
- **`#107`** — `[FEAT] Remove external market integration and serve catalog icons locally` (Closed/Merged)
- **`#19`** — `[NITPICK] No Full-Text Search (FTS) — catalog search uses LIKE patterns` (Closed/Merged)
- **`#79`** — `[NITPICK] Add standard start script to frontend/package.json for production deployment` (Closed/Merged)
- **`#75`** — `[NITPICK] Log network and parsing exceptions in live trader extractor instead of silent pass` (Closed/Merged)
- **`#74`** — `[MINOR] Add playwright to backend/data-pipeline/requirements.txt` (Closed/Merged)
- **`#82`** — `[FEAT] Saved search presets sidebar & quick-filter drawer for authenticated users in Marketplace UI` (Closed/Merged)
- **`#9`** — `[Milestone] Structured Public Crafting & WTB Request Board` (Closed/Merged via PR #102)
- **`#10`** — `[Milestone] Trait Research Tracker & Automated Market Matching Engine` (Closed/Merged via PR #101)
- **`#8`** — `[Milestone] Smart Build Importer & Market Deal Recommendation Engine` (Closed/Merged via PR #99)
- **`#37`** — `[MINOR] Auto-fit dropdown width to longest option name in EsoSelect and CharacterManager` (Closed/Merged via PR #98)
- **`#17`** — `[MINOR] WCAG contrast ratio concerns — dark background with muted text colors` (Closed/Merged via PR #97)
- **`#77`** — `[MINOR] Expand CORS configuration to support multiple origins and dynamic local network testing` (Closed/Merged)
- **`#18`** — `[NITPICK] Login.jsx is a 10-line stub — needs full implementation` (Closed/Merged)
- **`#71`** — `[MODERATE] Migrate frontend session token storage to HttpOnly SameSite cookies` (Closed/Merged)
- **`#13`** — `[MINOR] Remove unused body-parser dependency` (Closed/Merged)
- **`#68`** — `[MINOR] Add catch-all 404 route and themed NotFound page in React Router` (Closed/Merged)
- **`#67`** — `[MINOR] Synchronize Deals Only filter threshold with Deal badge calculation in Marketplace UI` (Closed/Merged)
- **`#73`** — `[MODERATE] Add batch size limits and numeric range validation on market and price uploads` (Closed/Merged)
- **`#72`** — `[MODERATE] Add helmet middleware for HTTP security headers and CSP protection` (Closed/Merged)
- **`#69`** — `[MODERATE] Add composite database indexes on guild_trader_listings for megaserver filtering` (Closed/Merged)
- **`#29`** — `[MODERATE] Dead/unreachable code block in fetch_market_data.py (lines 140-182)` (Closed/Merged)
- **`#66`** — `[MODERATE] Dedicated rate limiting and single-flight lock for live scraper extraction endpoint` (Closed/Merged)
- **`#65`** — `[MODERATE] Add global unhandledRejection and graceful shutdown handlers in server.js` (Closed/Merged)
- **`#64`** — `[MODERATE] Restore SSL certificate and hostname verification in live trader extractor` (Closed/Merged)
- **`#63`** — `[MODERATE] Implement input validation and sanitization on authentication endpoints` (Closed/Merged)
- **`#60`** — `[MODERATE] Gate DEV-Only Clear Listings button from production Marketplace UI` (Closed/Merged)
- **`#61`** — `[MODERATE] Add dotenv dependency and loader to backend server initialization` (Closed/Merged)
- **`#62`** — `[MODERATE] Handle child process error event in scraper endpoint to prevent server crashes` (Closed/Merged)
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