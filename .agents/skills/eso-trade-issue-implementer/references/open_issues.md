# Known Open Issues — ESO Trade Project

This is the list of known open issues as of the August 13 2026 audit.
When implementing an issue, cross-reference this list to check for
related issues that could be addressed together.

## CRITICAL (Fix Before Release)

| # | Title | File(s) | Effort |
|---|---|---|---|
| 24 | Remove `generate_mock_market_data()` — Synthetic Data Violation | `data-pipeline/fetch_market_data.py` L:228-370, L:434 | 15 min |
| 25 | Replace unsalted SHA-256 password hashing with bcrypt | `server.js` L:1503-1504, L:1532, L:1561 | 1 hr |
| 26 | Remove hardcoded backdoor session tokens | `server.js` L:1511-1513 | 10 min |
| 27 | Gate/remove unauthenticated `/api/dev/bypass-login` endpoint | `server.js` L:1607-1687, L:1485 | 30 min |

## MODERATE

| # | Title | File(s) | Effort |
|---|---|---|---|
| 28 | Duplicate `GET /api/characters` route | `server.js` L:336 & L:1693 | 10 min |
| 29 | Dead/unreachable code in `fetch_market_data.py` L:140-182 | `data-pipeline/fetch_market_data.py` | 5 min |
| 30 | No rate limiting middleware | `server.js`, `package.json` | 1 hr |
| 31 | In-memory session store not production-ready | `server.js` L:1511 | 2 hrs |
| 32 | Hardcoded default `password123` in DevAccountModal | `DevAccountModal.jsx` L:13, L:75 | 10 min |

## MINOR

| # | Title | File(s) | Effort |
|---|---|---|---|
| 13 | Remove unused `body-parser` dependency | `backend/package.json` | 5 min |
| 14 | DatabaseSchema.md references PostgreSQL, actual is SQLite | `docs/DatabaseSchema.md` | 1 hr |
| 15 | Root README.md is empty (19 bytes) | `README.md` | 1 hr |
| 16 | No `.env.example` file | `.env.example` (new) | 15 min |
| 17 | WCAG contrast ratio concerns | CSS files, `eso-select.jsx`, modals | 2 hrs |

## NITPICK

| # | Title | File(s) | Effort |
|---|---|---|---|
| 18 | `Login.jsx` is a 10-line stub | `pages/Login.jsx` | 1-2 hrs |
| 19 | No FTS — catalog search uses LIKE patterns | `populate_sqlite.py`, `server.js` | 2 hrs |
| 20 | No automated expired listing TTL purge | `watcher.py` or `server.js` | 30 min |
| 21 | Test coverage is minimal (2 test files) | New test files | 8+ hrs |
| 22 | Pipeline README lacks setup instructions | `data-pipeline/README.md` | 30 min |
| 23 | No deployment guide | `docs/DEPLOYMENT.md` (new) | 1-2 hrs |

## Related Issue Groups

Fixing these together saves time:

- **Security Batch**: #25, #26, #27, #32 — all in `server.js` auth section
- **Code Cleanup Batch**: #24, #29 — both in `fetch_market_data.py`
- **Documentation Batch**: #14, #15, #16, #22, #23 — all docs
- **Production Readiness Batch**: #26, #27, #30, #31 — all server hardening
