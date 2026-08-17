## 🎯 Linked Issue
<!-- 
MANDATORY: Link the issue number below using closing keywords (Closes #X, Fixes #X, Resolves #X).
This guarantees automated GitHub issue closure and priority queue synchronization upon merge.
-->
Closes #

---

## 📝 Summary of Changes
<!-- Provide a clear, concise summary of the problem and the technical solution implemented. -->

- 
- 

---

## 🛠️ Subsystems Affected
<!-- Check all subsystems modified in this Pull Request -->
- [ ] **Backend API** (`backend/server.js`)
- [ ] **Frontend UI** (`frontend/src/`)
- [ ] **Data Pipeline** (`backend/data-pipeline/`)
- [ ] **Database Schema** (`eso_catalog.db` / `server.js`)
- [ ] **In-Game Lua Addon** (`addon/ESOTrade/`)
- [ ] **CI/CD & Workflows** (`.github/workflows/`)
- [ ] **Documentation & Architecture** (`docs/`, `.agents/`)

---

## 🧪 Verification & Testing
<!-- Detail how the changes were tested and verified. Include commands and test outputs. -->

### Automated Tests Run
```bash
# Example test commands:
# cd backend && node server.js
# cd frontend && npm run build
# cd backend/data-pipeline && python test_db_queries.py
```

### Verification Results
- [ ] Backend server initializes cleanly (`node server.js`)
- [ ] Frontend builds without TypeScript/JSX errors (`npm run build`)
- [ ] SQLite schema migrations / queries execute without errors
- [ ] Unit & integration test scripts pass

---

## 🛡️ Architecture & Inviolable Rules Checklist
<!-- Refer to .agents/AGENTS.md. All checkboxes MUST be satisfied. -->
- [ ] **100% Data Authenticity**: No synthetic, fake, or mock listings/guilds generated.
- [ ] **Search Criteria Guarantee**: Active DB listings remain 100% discoverable.
- [ ] **ZOS TOS Compliance**: Lua addon uses only read-only official ESO API hooks.
- [ ] **Security**: No hardcoded secrets, backdoor tokens, or unparameterized SQL.
- [ ] **Single WIP = 1**: PR references the single active task from Tracking Issue #35.

---

> [!TIP]
> **Maintainer Notice**: When merging this PR, choose **"Squash and merge"** on GitHub to ensure the PR title and `Closes #<N>` keyword are permanently included in the merge commit message. This automatically closes the linked issue and triggers `.github/workflows/sync-priority-queue.yml`.
