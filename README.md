# ESO-Trade-Project

Modern, high-performance market trading intelligence platform, live guild trader index, character equipment loadout manager, and trait research matrix for *The Elder Scrolls Online* (ESO).

## Quick Start & Environment Setup
1. **Backend**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm start
   ```
2. **Frontend**:
   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

## Documentation
- [UI Components & Design System](docs/UI_COMPONENTS.md) — Standardized UI component catalog, styling tokens, accessibility guidelines, and custom Tooltip specification.
- [Backend Architecture & API](backend/README.md) — API endpoints, SQLite schema, rate limiting, and session authentication.
- [Data Pipeline & Ingestion](backend/data-pipeline/README.md) — Automated Lua SavedVariables ingestion, real-time market scrapers, and desktop watcher daemon.