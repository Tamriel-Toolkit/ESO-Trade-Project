# ESO Marketplace — integrated Gilded Exchange review

## Delivery and approval

The owner approved **C — Gilded Exchange** and explicitly requested the **full restyle plus rename to ESO Marketplace**. The application-wide implementation continues in [draft PR #133](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/pull/133). This report records the integrated review on **12–13 September 2026**, not a production deployment or final owner sign-off. Issue #132 remains open.

The [design system](../../DESIGN_SYSTEM.md) and [agent style guide](../../../.agents/STYLE_GUIDE.md) preserve the approved direction for subsequent work. The A/B/C harness in this directory remains a historical comparison tool; it is not shipped as an alternative application theme.

## What changed

- Charcoal surfaces, golden-yellow accents, parchment text, self-hosted Cinzel display type, and readable sans-serif controls/data form a single shared system. Fine metalwork corners and the navigation diamond recur at composition boundaries instead of decorating every field.
- Home uses the approved arched merchandise composition and compact category links. Marketplace puts search first, groups all existing refinements, and uses compact offers with aligned unit price, stack price, quantity, seller, location, and observation time.
- Requests and orders use specification/offer/status/action groups; Builds use readable titles and set lists with dedicated equipment/comparison surfaces. Character identity and equipment take precedence over the anatomical ornament. Research retains the complete labeled matrix.
- Menus, account forms, 404, development tools, dialogs, nested set selection, and mobile saved searches use the same surfaces, boundaries, and focus feedback. Dialogs are viewport-bounded and restore focus; equipment inspection is reachable by keyboard and touch as well as hover.
- Visible product branding, document title, footer, account copy, and the branded portion of existing generated messages use **ESO Marketplace**. The ESO square and original Lucide, item, equipment, class, and alliance icon language remain.

## Coverage and behavior preservation

| Coverage | Preserved contract / verification |
| --- | --- |
| Shared foundations (#80/#104) | Vitest/Testing Library DOM setup; semantic tokens, shared controls, typography, local font assets/license, motion and focus rules. Six token tests check 16 text pairs at 4.5:1, eight essential input/focus pairs at 3:1, primary-button text, local fonts, and reduced-motion declarations. These are token checks, not a full rendered accessibility audit. |
| Shell and utility pages (#119/#131) | All routes and mobile destinations, dropdown/settings/account actions, developer gating, auth payloads and validation, original redirects and storage identifiers. [Shell parity](shell-parity.md); 9 shell and 4 auth checks. |
| Home (#120) | Existing category retrieval and destination URLs, catalog count, character entry points, and original icon family. Decorative cached item art does not imply recommendations or live stock. |
| Marketplace and saved searches (#121/#122) | Listings/catalog mode, query inputs, hub and trade presets, category/subcategory/trait/quality/time/sort, deal threshold 1.2, 20-row pagination, selected detail, saved-search submit/apply/pin/delete, and existing admin clear gating. Five tests cover query/callback contracts, exact in-game search command, prices and stack counts, and the catalog empty state. The previous character-link button is labeled for its actual destination; no watchlist action is added. |
| Requests, orders and forms (#123–125) | Server, filters, sorting, pagination, existing role/status actions, unit/total arithmetic, clipboard semantics, validation, payloads and callbacks. [Detailed parity](requests-builds-parity.md); 15 tests. |
| Builds and dialogs (#126–128) | Explicit search submission, filters, all 13 creator slots and existing options, set resolution, authored data, save/delete permissions, equipment bars, comparison requests/calculations and market destinations. [Detailed parity](requests-builds-parity.md); 5 tests. |
| Characters, equipment, research (#129/#130) | Roster filters/actions, all 14 equipment positions and fallbacks, set/trait calculations, both weapon bars, all four research disciplines, state meanings, matching requests and structured marketplace URLs. [Character parity](characters-parity.md); 20 tests. |

Two additional shared-control tests cover selection/cancellation and disabled actions. The **66 tests** are isolated component/contract checks, not evidence that real mutations were submitted. Independent source comparison found no actionable business-logic regression in the implementation.

No backend, addon, ingestion, database schema, API client, auth provider, theme preference storage, or business calculation implementation is changed. Existing `ESOTrade` identifiers and Tamriel geography are not renamed. User-authored names/descriptions are not rewritten. No listing lifecycle, purchase-removal logic, new routes, or product features are included.

## Verification results

Run from `frontend`:

```powershell
npm test
npm run lint
npm run build
```

- **66 tests passed across 8 files.** Test source is in `frontend/src/__tests__`; the lockfile records the development-only test dependencies.
- **Lint passes with warnings and no errors.** Remaining warnings concern existing unused state/imports, hook dependencies, and mixed component/helper exports. The touched developer dialog no longer calls a hook conditionally. Handlers and hook dependencies were not altered merely to suppress warnings.
- **Production build passes.** Vite retains the mixed static/dynamic `api.js` import warning and the >500kB bundle warning. No bundle-splitting feature refactor is included.
- The final component/lint/build commands were repeated successfully on 13 September after unused-import cleanup. The eight isolated historical concept tests also still pass.
- **`git diff --check` passes.** Production source/document title no longer contain the old product brand. The concept archive and repository/package/addon identifiers intentionally retain historical/technical names.
- **54 route/viewport checks pass** in Chromium **149.0.7827.55**: Home, Marketplace, catalog, Requests, My Orders, Builds, Characters, Trait research, and 404 at 1440×1000, 390×844, 360×780, 768×1024, 1024×768, and 720×450. No page JavaScript errors, non-local resource requests, or page-level horizontal overflow were found. Wide research tables and narrow navigation remain intentionally contained scroll regions.
- Guest sign-in and registration were reviewed at 1440px and 390px; both registration widths passed an additional page-overflow check.
- **24 request/build dialog-state checks pass** across desktop, 390px, 360px, and 720×450: unconfigured/configured request, equipment, comparison, creator, and nested set picker. Verified bounds, horizontal overflow, action reachability, initial focus, nested Escape, and opener restoration; no page JavaScript errors. See the detailed parity report for exact viewport heights.
- Character/profile/add-dialog and marketplace interactions passed at 1440×1000, 390×844, 360×780, and 720×450: all 14 slots, both bars, all four disciplines, matrix focus, modal bounds, profile Escape/opener restoration, keyboard item selection, unchanged three-stack/300-item feathers display, and narrow-screen saved-search Escape/focus return. Reduced-motion Home had no active animations. No page JavaScript errors were reported.
- **10 state/utility checks pass** at 1440px and 390px: marketplace loading-to-empty, simulated HTTP 503 fallback, settings controls/Escape/focus return/outside closure, guest account links/Escape/focus return/route closure, and login validation preventing authentication submission. The isolated browser blocked writes and other origins; no prohibited requests, page errors, or horizontal overflow occurred. The HTTP 503 result is the existing empty-state fallback, not a dedicated error message. Initial mobile test failures targeted content covered by the dropdown and checked React removal too early; fresh-page cases, a verified uncovered target, and DOM-removal waits resolved the test issues without app changes.

The old system Chrome 108 does not correctly render this Tailwind build's modern color-mix utilities. Its intermediate integrated captures were discarded; accepted integrated screenshots use Chromium 149. The historical plain-CSS concept checks are a separate record.

### Data and test isolation

Browser review used an isolated copy of existing local SQLite data, an explicit review API at `127.0.0.1:5012`, and this branch's frontend at `127.0.0.1:5174`. It did not use or modify the user's API/database on port 5001. Review sessions can write session/expiry housekeeping only to that copied database. No create, delete, claim, fulfill, market-upload, or other business mutation was submitted through the review UI.

All browser traffic was restricted to the two review origins. Icons were served from existing local cached artwork or the existing fallback with upstream fetching disabled; fonts are local. No market rows, prices, or guilds were fabricated. Empty current request views reflect the review clock; the existing **All Statuses** option exposes six genuine expired/fulfilled records for populated review. Configured request screenshots show an **unsent form**, not a newly created request.

## Current captures

These show the real integrated React app, not the concept harness. Most page captures show the initial viewport; dialogs and matrices continue in their existing scroll regions. [Before images and historical A/B/C concepts](README.md#captures) remain available for comparison.

| Surface | Desktop (1440px) | Mobile (390px) |
| --- | --- | --- |
| Home | [View](previews/integrated-home-1440.png) | [View](previews/integrated-home-390.png) |
| Marketplace | [View](previews/integrated-marketplace-1440.png) | [View](previews/integrated-marketplace-390.png) |
| Item catalog | [View](previews/integrated-catalog-1440.png) | [View](previews/integrated-catalog-390.png) |
| Selected listing | [View](previews/integrated-market-detail-1440.png) | [View](previews/integrated-market-detail-390.png) |
| Requests | [View](previews/integrated-requests-1440.png) | [View](previews/integrated-requests-390.png) |
| Historical requests | [View](previews/integrated-requests-history-1440.png) | [View](previews/integrated-requests-history-390.png) |
| My orders | [View](previews/integrated-orders-1440.png) | [View](previews/integrated-orders-390.png) |
| Request form | [View](previews/integrated-request-form-1440.png) | [View](previews/integrated-request-form-390.png) |
| Configured request (unsent) | [View](previews/integrated-request-configured-1440.png) | [View](previews/integrated-request-configured-390.png) |
| Builds | [View](previews/integrated-builds-1440.png) | [View](previews/integrated-builds-390.png) |
| Build equipment | [View](previews/integrated-build-equipment-1440.png) | [View](previews/integrated-build-equipment-390.png) |
| Build comparison | [View](previews/integrated-build-comparison-1440.png) | [View](previews/integrated-build-comparison-390.png) |
| Build creator | [View](previews/integrated-build-creator-1440.png) | [View](previews/integrated-build-creator-390.png) |
| Nested set picker | [View](previews/integrated-build-set-picker-1440.png) | [View](previews/integrated-build-set-picker-390.png) |
| Characters | [View](previews/integrated-characters-1440.png) | [View](previews/integrated-characters-390.png) |
| Character profile | [View](previews/integrated-character-profile-1440.png) | [View](previews/integrated-character-profile-390.png) |
| Add character | [View](previews/integrated-character-add-1440.png) | [View](previews/integrated-character-add-390.png) |
| Trait research | [View](previews/integrated-traits-1440.png) | [View](previews/integrated-traits-390.png) |
| Jewelry research | [View](previews/integrated-trait-jewelry-1440.png) | [View](previews/integrated-trait-jewelry-390.png) |
| Sign-in | [View](previews/integrated-login-1440.png) | [View](previews/integrated-login-390.png) |
| Registration | [View](previews/integrated-register-1440.png) | [View](previews/integrated-register-390.png) |
| 404 | [View](previews/integrated-404-1440.png) | [View](previews/integrated-404-390.png) |
| Marketplace loading | [View](previews/integrated-state-market-loading-1440.png) | [View](previews/integrated-state-market-loading-390.png) |
| Marketplace empty | [View](previews/integrated-state-market-empty-1440.png) | [View](previews/integrated-state-market-empty-390.png) |
| Existing HTTP 503 fallback | [View](previews/integrated-state-market-error-1440.png) | [View](previews/integrated-state-market-error-390.png) |
| Settings | [View](previews/integrated-state-settings-1440.png) | [View](previews/integrated-state-settings-390.png) |
| Guest account menu | [View](previews/integrated-state-guest-account-1440.png) | [View](previews/integrated-state-guest-account-390.png) |
| Login validation | [View](previews/integrated-state-login-validation-1440.png) | [View](previews/integrated-state-login-validation-390.png) |

The separate [three-stack feathers capture](previews/integrated-market-feathers-1440.png) preserves 2,100g/item, 100 items/stack, 210,000g/stack, and three stacks/300 total.

## Remaining acceptance and known limitations

- **Owner review is required** for the finished identity and first-impression comprehension. No measured usability improvement or final design sign-off is claimed.
- The 720×450 reflow check is **not** a manual browser-menu 200% zoom test. Manual zoom, screen-reader review, and other-browser verification remain outstanding. Token contrast checks do not certify every rendered combination or every possible state.
- Existing functional/data limitations are preserved: the Settings PC/Console cycling mismatch described in [shell parity](shell-parity.md), gear-slot fallback mappings and set-count rules, source catalog formatting/missing artwork, and existing query/lifecycle limitations. A simulated marketplace HTTP 503 still reaches the empty state through the unchanged API wrapper; a dedicated error message is not present. This PR does not silently repair these behaviors under a visual-only scope.
- Regression tests and sampled live UI checks support parity, but are not exhaustive end-to-end coverage of every destructive action, network-failure combination, account state, or game transaction. Such mutations were deliberately tested through isolated API doubles rather than user data.
- #80, #104, and #119–131 have implementation coverage here but are not automatically closed. Their agreed acceptance and dependency review, plus final full-app acceptance, must precede umbrella closure. The fresh live queue on issue #35 remains authoritative.
