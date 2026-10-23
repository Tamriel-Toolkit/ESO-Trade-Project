# ESO-Trade-Project

Modern, high-performance market trading intelligence platform, live guild trader index, character equipment loadout manager, and trait research matrix for *The Elder Scrolls Online* (ESO).

## Quick Start & Environment Setup
1. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   npm ci
   npm start
   ```
2. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env
   npm ci
   npm run dev
   ```

Each clone or Git worktree needs its own dependency installation. Run `npm ci` in both `backend` and `frontend` before starting them, including in a Codex review worktree. Dependencies are not shared with your original checkout.

## Documentation
- [UI Components & Design System](docs/UI_COMPONENTS.md) — Standardized UI component catalog, styling tokens, accessibility guidelines, and custom Tooltip specification.
- [Listing Lifecycle & Absence Feasibility](docs/LISTING_LIFECYCLE.md) — Evidence-based UID listing lifecycle, purchase tombstones, expiry rules, and ESO API absence-reconciliation feasibility analysis.
- [Backend Architecture & API](backend/README.md) — API endpoints, SQLite schema, rate limiting, and session authentication.
- [Data Pipeline & Ingestion](backend/data-pipeline/README.md) — Automated Lua SavedVariables ingestion, real-time market scrapers, and desktop watcher daemon.