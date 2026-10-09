# Backend and pipeline regression tests

Run from `backend/` after `npm ci`:

```sh
npm test
```

Run from `backend/data-pipeline/` with Python 3.11 or later:

```sh
python -B -m unittest -v test_db_queries test_ttl_purge test_catalog test_watcher test_parser_failures
```

CI explicitly runs both commands. Frontend testing is separate.

## Safety and repeatability

- Node tests copy the current server, its local modules, static set metadata, and
  fallback asset into an OS-owned temporary directory. They do **not** copy the
  developer database, icon cache, or `.env` files. Dependencies resolve through
  the installed backend `node_modules`; production source is not rewritten.
- Each server uses an OS-assigned port. Child environments exclude ambient
  database paths, credentials, proxy settings, and `NODE_OPTIONS`.
- Icon upstream responses are deterministic, test-only stubs. No UESP calls are
  made, including the older API suite's icon smoke check. Assertions distinguish
  PNG bytes/cache hits from SVG fallback and check single-flight request counts.
- Python databases are in memory or temporary directories. SavedVariables
  fixtures are temporary files; no installed addon or real character data is used.
- Cleanup waits for the child/database to close, including assertion and startup
  failures. Only the exact directory allocated by the fixture is removed.
- Fixture guilds/accounts/listings exist only in these disposable environments.
  Never point a test at the application database or seed production marketplace data.

## Coverage map

| Suite | Contracts |
|---|---|
| `test_api_endpoints.js` | Existing authentication, cross-account authorization, migration diagnostics, rollback diagnostics, traits, exact stack prices, requests, builds, saved searches; includes proxy regressions |
| `test_backend_failures.js` | Real icon route cache/fallback/validation/concurrency, production cookies/dev-route denial, expired sessions, malformed JSON, native-upload rollback and replay, fixture startup cleanup |
| `test_catalog.py` | Repeat upserts, preservation of dependent listings/equipment and omitted items, rollback across the 5,000-row batch boundary and SQL errors, invalid JSON |
| `test_db_queries.py` | Exact query results/category counts, replacing print-only checks |
| `test_ttl_purge.py` | Production expiry-trigger SQL: expired insert, active/null expiry, selective update deletion |
| `test_watcher.py` | Repeated stacks, exact pricing, self-write suppression, no-token local sync, commit-failure scan preservation |
| `test_parser_failures.py` | Truncated/unbalanced files, invalid UTF-8, invalid price/quantity, missing files, safe reset refusal, actual SQLite rollback |

## Safety fixes exposed by the tests

Native API uploads previously committed each statement independently. A late SQL
failure could leave a partial batch despite returning HTTP 500. Uploads now use
a dedicated SQLite transaction/connection, including character auto-discovery
and existing reconciliation, so failures cannot commit a subset or roll back
another request's work. Listing lifecycle/reconciliation policy is unchanged.

The regex importer previously accepted truncated structures or discarded invalid
UTF-8 and could divide by zero for zero-quantity stacks. Preflight now rejects
these before opening SQLite or clearing scans. It also rejects embedded braces
and escaped quotes in strings because the existing regex extraction cannot
safely handle them. Those files are retained with a diagnostic; this is **not**
a full Lua parser, and broader Lua-string support remains a future enhancement.

These tests cover explicit contracts, not every backend branch. Adding new test
modules requires adding them to the relevant package command or CI's Python list.
