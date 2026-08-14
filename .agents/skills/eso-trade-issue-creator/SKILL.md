---
name: eso-trade-issue-creator
description: >-
  Use this skill whenever the user or an agent needs to create, file, or
  open a new GitHub issue on the ESO-Trade-Project repository. Standardizes
  issue formatting, severity classification, architecture mapping, and
  acceptance criteria, and automatically recalculates and synchronizes the
  master priority queue on GitHub Tracking Issue #35 and .agents/PRIORITY_QUEUE.md.
---

# ESO Trade Project — Issue Creator & Backlog Queue Skill

This skill standardizes how new issues are filed against the ESO-Trade-Project repository and ensures every newly created issue is instantly evaluated and placed into the central backlog priority queue.

---

## 1. Issue Title & Severity Taxonomy

All issue titles MUST strictly follow the severity prefix convention:

| Prefix | Severity Category | Example Scenario |
|---|---|---|
| `[CRITICAL]` | Security vulnerability, data loss, crash, ZOS TOS breach | Plaintext passwords, backdoor tokens, SQL injections |
| `[MODERATE]` | Core functional bug, shadowed route, API contract break | Ingestion parser exception, duplicate route handler |
| `[MINOR]` | Secondary bug, contrast issue, minor config gap | Missing `.env.example`, unused dependency |
| `[NITPICK]` | Code cleanup, logging formatting, style tweaks | Comment spelling, unused variable, dead code |
| `[FEAT]` | New feature or architectural enhancement | New pricing algorithm, UI filter modal, FTS search |

---

## 2. Standardized Issue Body Template

When creating an issue using the GitHub MCP tool `issue_write`, format the body using this exact markdown structure:

```markdown
## Summary
A concise 2-3 sentence overview of the bug, vulnerability, or feature.

## Current Behavior
What currently happens in the codebase (e.g., "The auth system uses unsalted SHA-256...").

## Target Architecture / Expected Behavior
What should happen instead, following ESO Trade Project architectural conventions.

## Files Affected
- \`backend/server.js\` (L:1500-1700)
- \`frontend/src/pages/Login.jsx\`

## Severity & Acceptance Criteria
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Unit/Integration tests pass with zero errors

## Dependencies & Blockers
- **Blocked By**: None (or specify #IssueNumber)
- **Prerequisite For**: #IssueNumber (if applicable)
```

---

## 3. Tool Execution: Creating the GitHub Issue

Use the GitHub MCP `issue_write` tool:

```json
call_mcp_tool github-mcp-server issue_write {
  "owner": "RyanS4",
  "repo": "ESO-Trade-Project",
  "method": "create",
  "title": "[<SEVERITY>] <Descriptive Summary>",
  "labels": ["bug", "security"], // choose appropriate labels
  "body": "...formatted issue body..."
}
```

---

## 4. Automatic Priority Queue Re-Evaluation & Sync

Immediately after creating the new GitHub issue:

1. **Calculate Priority Tier & Rank**:
   - **Tier 1 (Critical Security & Data Authenticity)**: Placed at top of queue (Ranks 1-6).
   - **Tier 2 (Core Backend Bugs & Data Ingestion)**: Placed in middle (Ranks 7-10).
   - **Tier 3 (UI & User Experience)**: Placed behind backend/auth dependencies.
   - **Tier 4 (Feature Plans & Milestones)**: Placed after core stability.
   - **Tier 5 (Documentation & Nitpicks)**: Placed at bottom of queue.

2. **Update Master Tracking Issue #35 (Live SSOT)**:
   - Call `issue_write` with method `update` on issue #35 to insert the new row into the **Live Execution Matrix**.
   - Format: `| Rank | #<N> | <Area> | <SEVERITY> | ⚪ Queued | <Blockers> | <Rationale> |`

3. **Update Local In-Tree Mirror on `main`**:
   - If working on `main`, update [`.agents/PRIORITY_QUEUE.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/PRIORITY_QUEUE.md) to match Tracking Issue #35.

