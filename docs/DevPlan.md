# Development Plan

## Current foundation

- Complete UESP-backed item catalog with taxonomy and set metadata.
- Conflict-safe SQLite catalog refresh.
- Native ESOTrade SavedVariables ingestion and authenticated scan upload.
- Same-origin item icon delivery with disk cache, request deduplication, cache headers, and a local fallback.
- React catalog and native listing views.
- Accounts, characters, builds, trait research, saved searches, and public trade requests.

## Near-term priorities

Follow GitHub Tracking Issue #35 for live ordering. New work should preserve the catalog/live-data boundary, avoid destructive data migrations, add API and UI tests, and keep image delivery behind the backend cache.
