# Requests and Builds — integrated C restyle

Implemented for the approved **Gilded Exchange** direction and **ESO Marketplace** product name. This is a presentation and accessibility pass, not a new request lifecycle, marketplace algorithm, or build system. Final integrated owner acceptance remains pending.

## Composition

- Requests and My Orders use the shared page heading, charcoal/gold tokens, a compact unboxed statistics strip, grouped refinements, and two-column desktop / single-column mobile request cards.
- Request cards keep the original item icons and quality/status colors, but give the full item name, specifications, total offer, per-item price, people, and actions a clear reading order. User-supplied names and delivery notes are not rewritten. Redundant badge borders and serif utility text are reduced.
- Builds use framed gallery cards with restrained Cinzel titles, readable descriptions, unboxed set lists, and distinct equipment/comparison actions. Class and role icons are retained.
- Request creation, build creation, build details/comparison, and the nested set picker use bounded dialog surfaces, scrolling content, readable fields, visible focus, and reachable close/action controls. A shared focus stack handles nested Escape and focus restoration. Catalog result rows are real keyboard-operable buttons.
- The existing branded portions of the C.O.D. note and trader-route clipboard text now say **ESO Marketplace**. Addon names, storage keys, routes, API identifiers, and Tamriel locations are unchanged.

## Preserved contracts

| Surface | Retained behavior |
| --- | --- |
| Public requests | NA/EU, search by item/set/handle, request type, category, status options, all five sort options, reset, request count, open/claimed stats, 12-row offset pagination, post-request modal, and My Orders route. The original fetch/dependency behavior is unchanged. |
| My Orders | Signed-out login/browse destinations; server, search, sort, 100-row fetch limit, owner-or-claimer filtering, active/posted/claimed/fulfilled predicates and counts, total value calculation, and 12-row local pagination. |
| Request actions | Original OPEN / IN_PROGRESS / COMPLETED / FULFILLED / CANCELLED / EXPIRED branches; owner, claimer, other-user and signed-out conditions; claim, release, unassign, complete, fulfill and cancel handlers; pending disable behavior and confirmation prompts. The existing claim countdown and expiry text remain. |
| Request values and copy | `offered_gold_price × quantity` total, per-item offer, set/trait/style/quality/CP/level data, buyer/merchant handles, delivery notes, `/w` command and C.O.D. note contents apart from the approved brand prefix. |
| Request form | 250ms catalog search, item classification, set inference, applicable trait choices/defaults, jewelry style exclusion, material quantity default of 8, quality/level choices, validation, all existing payload fields and coercions, selected server, success callbacks, and existing error/loading states. No level mapping or item-classification logic was changed. |
| Build gallery | Existing fetch by class/role, explicit search-submit behavior, reset behavior, authored title/description/author/set data, curated/custom badges, tradeable/bound counts, permission-gated delete, equipment/comparison entry points, and sign-in/create destinations. |
| Build details | Build and character fetches, active weapon bars, gear mapping, set counts, acquisition counts, guide link, delete permissions/confirmation, selected-character and server comparison requests, completion/trait/missing metrics, price/no-listings qualifications, route-copy behavior, source labels, and structured marketplace query parameters. |
| Build creator | All 13 original default slots, class/role/title/notes state, every existing slot weight/weapon/trait/enchantment control, allowed-weight logic, set category/search predicates, set-item resolution payloads, source/tradeable data, save validation and exact payload/callback behavior. Existing unused author/source state was preserved, not silently converted into new fields. |
| Art and data | Every browser item request continues through `getEsoIconUrl` and `/api/icons/…`. Original Lucide/game art identities and existing fallbacks remain. No fabricated guild listings, price generators, new production records, or API/schema changes. |

## Verification completed

On 12 September 2026:

- `npm test -- src/__tests__/requests.test.jsx src/__tests__/builds.test.jsx`: **20 tests pass** (15 request/card/orders/form; 5 gallery/creator/details/comparison).
- Tests verify nine role/status action combinations, signed-out/pending disables, unit/total arithmetic, original cached icon route, exact clipboard messages, claim expiry, request query/pagination/server parameters, My Orders ownership and status tabs, request payload and success callbacks, explicit build search, creator validation and 13-slot save contract, nested picker resolution/focus, curated-delete restriction, weapon bars, comparison/server API calls, no-listings qualification, and structured marketplace routing.
- Tests exposed an initial nested-focus regression: JSX `autoFocus` ran before the shared hook captured the opener. Replaced it with the hook's explicit initial-focus ref for the set picker and request search. Search still receives focus and dismissal restores the correct opener.
- Production `npm run build`: **passes**. Existing mixed static/dynamic API-import and >500kB chunk warnings remain.
- Targeted `oxlint` across the seven owned components/pages: **zero errors** after removing unused imports. Ten pre-existing warnings remain: three hook-dependency warnings, three unused state setters, and four Fast Refresh mixed-export warnings. No handlers, dependencies, or state were changed to suppress them.

### Browser checks and captures

Ran isolated Chromium **149**, explicitly using `chromium-1228/chrome-win64/chrome.exe`, against the review frontend at `127.0.0.1:5174` and copied-data API at `127.0.0.1:5012`. The user's original API on port 5001 was not used. Browser network access was restricted to these two review origins; no business-record mutations were submitted. The only POST was review-context developer authentication for the existing account.

**24 dialog-state/viewport checks pass**: six states (empty request form, configured material request, equipment, comparison, creator, set picker) at **1440×1000, 390×844, 360×740, and 720×450** with reduced motion. Checks verified dialog bounds and horizontal overflow, no page JavaScript errors, request and creator action reachability, search initial focus, Escape closing only the nested picker, and restoration to the request/create/change-set opener. Twelve desktop/mobile dialog screenshots were captured and visually inspected. Visual follow-up separated the gold suffix from the native number spinner, reduced duplicate equipment labeling, and compacted comparison metrics on mobile; the complete check reran successfully afterward.

| State | Desktop | Mobile |
| --- | --- | --- |
| Request form | [1440px](previews/integrated-request-form-1440.png) | [390px](previews/integrated-request-form-390.png) |
| Configured request | [1440px](previews/integrated-request-configured-1440.png) | [390px](previews/integrated-request-configured-390.png) |
| Build equipment | [1440px](previews/integrated-build-equipment-1440.png) | [390px](previews/integrated-build-equipment-390.png) |
| Build comparison | [1440px](previews/integrated-build-comparison-1440.png) | [390px](previews/integrated-build-comparison-390.png) |
| Build creator | [1440px](previews/integrated-build-creator-1440.png) | [390px](previews/integrated-build-creator-390.png) |
| Nested set picker | [1440px](previews/integrated-build-set-picker-1440.png) | [390px](previews/integrated-build-set-picker-390.png) |
| Historical requests | [1440px](previews/integrated-requests-history-1440.png) | [390px](previews/integrated-requests-history-390.png) |

The active request view is empty under the September 12 clock. Selecting the **existing All Statuses filter** exposed six genuine historical request records for populated card review. These two additional captures retain their expired/fulfilled labels; no dates or statuses were altered to imply current availability.

## Limits

- This is not a live-game transaction test, screen-reader certification, or measured usability study. Create/delete/claim/fulfill payloads are verified by isolated component tests, not submitted through the user's data store.
- Historical card screenshots do not demonstrate live availability. The build set catalog still displays any pre-existing source formatting artifacts, and missing cached source art still uses the existing fallback; this restyle does not repair catalog data.
- Existing lifecycle/query limitations, including My Orders' original fetch limit and the form's existing level mapping, remain outside this presentation-only change.
