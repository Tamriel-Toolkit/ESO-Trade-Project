---
name: eso-trade-issue-reviewer
description: >-
  Use this skill whenever the user asks to "review an issue", "review the next issue",
  "review the current issue in the queue", or assess the status, necessity, scope, and
  solutions for any GitHub issue on RyanS4/ESO-Trade-Project. Evaluates 4 core dimensions
  (large-scale impact/necessity, amendments/closure/reprioritization, 1-5 proposed solutions
  with a recommended tag, and additional considerations) and renders a uniform table at the
  bottom of the output.
---

# ESO Trade Project — Standardized Issue Review Skill

This skill defines the mandatory protocol for reviewing any GitHub issue on the **ESO-Trade-Project** repository (e.g., when asked *"review an issue"*, *"review the next issue"*, *"review the current issue in the queue"*, or *"review issue #X"*).

Whenever an issue review is requested, you must perform an intensive technical and contextual assessment, and append the **Uniform Issue Assessment Table** at the bottom of the response.

---

## 1. Contextual Foundations (Always Keep in Mind)

When reviewing any issue, ground your analysis in the three pillars of the project:
1. **What We Are Building**:
   A real-time, authentic Tamriel trading intelligence platform, live guild trader index, character equipment loadout manager, trait research matrix, and public crafting request board for *The Elder Scrolls Online* (ESO).
2. **Who We Are Building It For**:
   - **Active Traders & Buyers**: Seeking real, unmanipulated guild trader listings across Tamriel capitals without traveling kiosk to kiosk.
   - **Crafters & Master Crafters**: Tracking 9-trait research progress and fulfilling custom gear orders for gold bounties.
   - **Theorycrafters & Everyday Players**: Planning gear sets, matching market prices to build requirements, and managing character loadouts.
3. **Cross-System Impact**:
   - **Lua Addon (`addon/ESOTrade/`)**: Runs in-game on the official ESO Lua API (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). Must strictly respect ZOS Terms of Service (no memory tampering, no direct network calls in Lua).
   - **Data Pipeline (`backend/data-pipeline/`)**: `watcher.py` desktop daemon and `parse_esotrade_addon.py` sync engine. Must avoid race conditions, file corruption, and self-trigger loops.
   - **Backend API & SQLite (`backend/server.js`)**: Port 5001, Express, SQLite (`eso_catalog.db`), bcrypt auth, session cookies, rate limiting, and local icon proxy caching.
   - **Frontend UI (`frontend/`)**: React 19, Vite, Tailwind CSS v4, Gilded Exchange visual theme (#111214 charcoal, #e6c15a gold, Cinzel typography).

---

## 2. The 4 Mandatory Assessment Dimensions

Every issue review must critically analyze the following four dimensions:

### 1. Large-Scale Impact & Current Necessity *(Most Important)*
- **Impact Assessment**: What does this issue change across the architecture, user experience, developer workflow, or data integrity?
- **Is It Still Needed?**: Is this issue still relevant today? Did recent pull requests, migrations, or design overhauls (such as the Gilded Exchange restyle or bcrypt auth migration) already resolve it, make it obsolete, or alter its requirements?
- **User & System Beneficiaries**: Who gains value from this fix/feature (players, crafters, server stability, security)?

### 2. Amendments, Closure, or Reprioritization
- **Amendments**: Should the issue scope, acceptance criteria, or target files be amended based on recent codebase changes?
- **Closure Recommendation**: Should the issue be closed as completed, obsolete, or duplicate?
- **Reprioritization**: Should another issue be prioritized *before* this one (e.g. an unlisted blocker, security prerequisite, or foundation dependency)?
- *Default*: If no amendments, closures, or priority changes are warranted, this field **MUST default to `N/A`**.

### 3. Proposed Solutions (1–5 Proposals with `(Recommended)`)
- Formulate between **1 and 5 concrete, technical implementation proposals**.
- Clearly explain the architectural mechanism of each proposal.
- Exactly one proposal **MUST be labeled `(Recommended)`**, representing the best architectural approach balancing reliability, simplicity, and project constraints.

### 4. Additional Comments or Considerations
- Highlight edge cases, security implications, migration safety, ZOS TOS constraints, performance bottlenecks, or backward compatibility concerns.
- *Default*: If there are no additional considerations, this field **MUST default to `N/A`**.

---

## 3. Review Workflow & Execution Steps

1. **Locate & Read the Issue**:
   - If reviewing "the current/next issue in the queue", inspect [`.agents/PRIORITY_QUEUE.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/PRIORITY_QUEUE.md) or query Master Tracking Issue [#35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35) to find the active Rank #1 item marked `🟡 Next Up`.
   - Read the target issue's full text, acceptance criteria, and labels using GitHub MCP tool `issue_read` (owner: `RyanS4`, repo: `ESO-Trade-Project`).
2. **Inspect Current Repository State**:
   - Check related source code, tests, and unstaged changes (`git status`, `git diff`).
   - Determine if prerequisite issues have been merged, if work is already partially drafted, or if requirements have evolved.
3. **Draft Technical Summary & Findings**:
   - Present the issue summary, technical root cause, affected files, and architecture context.
4. **Append Uniform Table at Bottom**:
   - The response **MUST ALWAYS CONCLUDE** with the Uniform Assessment Table specified in Section 4.

---

## 4. Standard Uniform Assessment Table Format

The table **must appear at the very bottom** of the review output. Use either the standard 4-column layout or the 2-column key-value layout below:

### Primary Format: 4-Column Layout

```markdown
| Large-Scale Impact & Necessity *(Critical)* | Amendments, Closure, or Reprioritization | Proposed Solutions (1–5 Proposals) | Additional Comments & Considerations |
|---|---|---|---|
| **Impact**: [High / Moderate / Low / Negligible]<br>**Still Needed?**: [Yes / No / Obsolete / Partially Implemented]<br><br>[Concise breakdown of system-wide consequences, who benefits, and why it is or is not needed today.] | [Amendments needed, closure recommendation, or prerequisite issue to prioritize first. Defaults to **N/A**] | 1. **(Recommended)** [Primary recommended solution]<br><br>2. [Alternative solution proposal]<br><br>3. [Optional additional solution] | [Cross-system impact, ZOS TOS compliance, performance, or security notes. Defaults to **N/A**] |
```

### Alternative Format: 2-Column Responsive Layout (For Detailed Multi-Paragraph Evaluations)

```markdown
| Dimension | Assessment & Findings |
|---|---|
| **1. Large-Scale Impact & Necessity** *(Critical)* | **Impact**: [High / Moderate / Low / Negligible]<br>**Still Needed?**: [Yes / No / Obsolete / Partially Implemented]<br>**Evaluation**: [Comprehensive analysis of system-wide impact, who benefits, and current necessity.] |
| **2. Amendments, Closure, or Reprioritization** | [Specific amendments to scope/criteria, closure recommendation, or reprioritization before/after another issue. Defaults to **N/A**] |
| **3. Proposed Solutions (1–5 Proposals)** | 1. **(Recommended) [Title]**: [Detailed technical proposal]<br>2. **[Title]**: [Alternative technical proposal]<br>3. **[Title]**: [Alternative technical proposal] |
| **4. Additional Comments & Considerations** | [Security, database integrity, ZOS TOS, performance, or edge cases. Defaults to **N/A**] |
```
