# Gilded Exchange — 15 September follow-up

The owner authorized upgrading the running app to the constructed **ESO Marketplace** UI, requested removal of user-facing Item Catalog, and reported that focused filter controls overlapped their labels. These changes remain in [PR #133](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/pull/133), under issue #132.

## Delivered changes

- All eight Marketplace selectors reserve **8px** between label and control. The existing **2px outline + 3px offset** remains visible, leaving 3px clear of the label. Neither clipping nor removal of focus feedback is used.
- Marketplace is listings-only. Removed the catalog tab, mode, fetching/rendering branch, unused frontend catalog wrapper and obsolete tab CSS. Removed catalog promotion/counts from Home and Settings; live scan status and category links remain.
- Legacy `view=catalog` URLs normalize to listings with replace-navigation, preserving other query parameters, hash and location state. Old saved searches apply their existing filters to listings; newly saved searches record listings mode. Name-only fallback behavior remains.
- Request/build item selection remains available, with shorter user-facing item/set wording. **Internal item metadata, `/api/items`, set lookup, taxonomy and cached icons are retained.** Removing the browsing feature is not permission to erase the shared database or its support APIs.
- No backend, schema, addon, watcher, authentication-provider or business-calculation changes. No user records were deleted or fabricated.

## Verification

- `npm test`: **71 passed across 9 files**. Added regression coverage for legacy catalog URLs/presets, query/hash/state preservation, listing-only empty state, Home destinations and Settings status.
- `npm run lint`: passes, warnings only. `npm run build`: passes with the existing mixed API-import and large-bundle warnings. `git diff --check`: passes.
- Chromium **149.0.7827.55**: **48 focus checks** (8 fields × 6 viewports), all with an 8px label gap. Widths/heights: 1440×1000, 390×844, 360×780, 768×1024, 1024×768 and 720×450. No page overflow, page JavaScript errors or prohibited requests in this follow-up run.
- Confirmed no catalog browsing requests, no catalog Home/Settings promotion, retained Home category destinations and scan status, and legacy URL normalization in the browser.
- Browser regression used the isolated review API/database at port 5012 and frontend 5174. It blocked writes and non-local traffic; it did not run against the user's port-5001 database.

Re-run the optional browser check with a modern Chromium executable and the isolated review servers already running:

```powershell
$env:PLAYWRIGHT_MODULE = '<path to installed playwright module>'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = '<path to modern chromium executable>'
node docs/design/issue-132/check-marketplace-followup.cjs --screenshots
```

The script refuses a review API on port 5001. The initial full-app route/dialog/keyboard review remains recorded in [IMPLEMENTATION.md](IMPLEMENTATION.md); its catalog captures are historical, superseded below.

| Current surface | Desktop | Mobile |
| --- | --- | --- |
| Filter focus clearance | [1440px](previews/followup-filter-focus-1440.png) | [390px](previews/followup-filter-focus-390.png) |
| Listings-only Marketplace | [1440px](previews/followup-listings-only-1440.png) | [390px](previews/followup-listings-only-390.png) |
| Home | [1440px](previews/followup-home-1440.png) | [390px](previews/followup-home-390.png) |
| Settings | [1440px](previews/followup-settings-1440.png) | [390px](previews/followup-settings-390.png) |

## Shipping and acceptance boundaries

The identified running app is the original local checkout at **localhost:5173**, backed by port **5001**. Port 5174 is the separate review worktree, not that running version. Repository inspection found no external deployment target: no GitHub Pages/deployments and no deployment workflow. Local promotion does not establish deployment to an external website.

Promotion must preserve the original checkout's two unrelated dirty queue files, leave its backend process/database alone, and verify the resulting frontend against the existing read-only API. The PR remains available for normal repository integration; shipping authorization is not permission to bypass required CI checks.

**Local promotion completed:** the original checkout now uses `codex/issue-132-live-ui`, based on PR #133's application commit `0d14028`. Frontend dependencies were installed from the lockfile, then the production build and all 71 tests passed again in that checkout. Only Vite was restarted; the original port-5001 backend process was left running. The two unrelated queue-file SHA-256 hashes are unchanged. No database was copied over the user's database and no business mutation was submitted.

Read-only guest browser checks covered **18 route/viewport combinations** on the actual app/API (nine routes at 1440px and 390px), with no page JavaScript errors or horizontal overflow. The rapid full-page review hit the existing one-minute request limiter near the end; after its window elapsed, Marketplace, Characters, Trait research and My Orders were rechecked at 390px with successful data/status reads and no throttling. Guest auth checks correctly returned 401; populated authenticated workflows remain supported by the earlier isolated review, not this guest smoke test.

The previous GitHub run at commit `e2eee15` was cancelled before frontend/backend jobs ran. The replacement [CI run for application commit `0d14028`](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/actions/runs/35042435801) **passed**: frontend production build, backend integration, Python database validation, watcher feedback-loop regression tests and aggregate gate. The 71 frontend component tests were run locally; the current CI workflow does not execute that command. No merge or bypass of required checks was performed.

`npm ci` reported **14 pre-existing dependency advisories (9 high, 5 moderate)**. Audit/lockfile comparison confirmed all affected package versions were already present unchanged at baseline `f1c00db`; `--omit=dev` reports the same findings. They include existing tooling dependencies and React Router. No automatic dependency upgrade was bundled into this UI change.

Manual browser-menu 200% zoom, screen-reader and other-browser review, and individual linked-ticket acceptance remain outstanding. Owner shipping approval is recorded; it does not automatically close #132 or its related issues.
