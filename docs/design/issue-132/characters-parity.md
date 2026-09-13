# Characters and trait research — C implementation parity

The approved Gilded Exchange direction informs the charcoal surfaces, gold edge details, restrained Cinzel headings, existing class/alliance icon frames, and readable equipment rows. The public product name is **ESO Marketplace**, not the concept name.

## Preserved behavior

- Character fetching, account permissions, create/delete payloads, native removal confirmation, alliance/class filtering, reset actions, statistics, and profile modal entry points are unchanged.
- Character cards retain their click target and gain a named keyboard action. Remove remains available with the same event propagation protection; it is no longer hover-only.
- All 14 equipment slot definitions, fallback IDs, quality and trait lookup tables, icon normalization/fallback, item data, and front/back bar markings remain unchanged. Both weapon bars remain in the equipment list.
- The original anatomical illustration remains as a quiet background ornament. Item inspection still shows the original armor/weapon rating, set, trait description, and enchantment data. Hover remains available; focus and click/tap can show the same panel, with click selection retained after pointer exit.
- Profile set counts (including the current two-handed weapon rule), equipped trait calculations, and current API fields are unchanged. No calculation defects are bundled into this presentation work.
- Trait discipline grouping, research state values, totals, match lookup, server/character selectors, search filtering, and exact structured marketplace URLs remain unchanged. The full matrix is retained in a labeled, keyboard-focusable horizontal scroll region, with a sticky equipment-name column and visible status words.
- No prices, characters, market listings, timers, or item icons have been invented or persisted. No API, database, addon, authentication, storage-key, or ingestion change is included.

## Interaction and responsive checks

- Shared `useDialogFocus` handles initial focus, Tab/Shift+Tab containment, Escape dismissal, opener restoration, nested-dialog scroll locking, and cleanup. Existing backdrop-click behavior is untouched.
- Character/add dialogs are bounded by the dynamic viewport; content scrolls inside the panel. Narrow layouts use one equipment column with complete names and at least 12px metadata.
- Component tests cover all empty equipment slots, focus/click item inspection using an existing saved-profile item, cached icon failure fallback, structured trait search URLs, closed/open dialog behavior, focus wrap and return, and scroll-lock cleanup.
- Run `npm test -- --run src/__tests__/characters.test.jsx` and `npm run build` in `frontend`.
- Browser review must include 360px/390px and desktop roster, profile, add dialog, all research disciplines, and a long matrix. Real populated states require authenticated local API data; do not replace unavailable data with fabricated listings.

## Independent parity review — 6 September 2026

Reviewed the working changes against the committed baseline in `CharacterManager`, `CharacterProfileModal`, `AnatomicalEquipmentDiagram`, and `TraitTracker`, including the shared dialog-focus hook and character styles. The roster API calls, create/delete handlers, confirmation, statistics, and alliance/class matching remain unchanged. The profile's set-piece and trait calculations are unchanged, including their existing slot fallbacks. The trait discipline grouping, lookup keys, totals, filter predicate, server reloads, and generated marketplace query parameters are unchanged. No new business-logic regression was identified in this comparison.

The intentional interaction changes are presentation access: named keyboard entry points, keyboard/touch equipment inspection alongside hover, explicit selection states, labeled inputs/scroll regions, and dialog focus containment/return. The original source item, class, and alliance icon identities remain in use.

Executed the focused Login, Characters, and shared-controls suites: **11 tests passed across 3 files**. The existing character tests cover all 14 equipment buttons, one real historical gear item's inspection/icon fallback, three structured trait destinations, single-dialog focus wrapping/return, and unmount scroll cleanup. This is not exhaustive authenticated integration coverage: roster mutations, all research disciplines, nested dialogs, active set-count rendering, and responsive visual review still require the broader integration pass. No real account, character, or market record was changed by these tests.

## Consistency refinement — 12 September 2026

- Characters and Trait research now use the same `exchange-container` and `exchange-page-heading` alignment as Home and Marketplace. Removed the former nested container/gutter mismatch without changing page content or destinations.
- The trait character selector takes the width of its responsive wrapper, wraps separately from the NA/EU controls, and retains its original option labels. The server controls remain a separately named group.
- Master Crafter explanatory text is reachable from its focused badge as well as hover. Equipment inspection remains available on hover, focus, and click/tap. Researching cells retain the clock and status text without perpetual pulse animation.
- Character tests now pass **20 checks**, adding front/back presentation switching without removing any of the 14 slots, 14 additional structured trait-to-market destinations, and nested-dialog focus/scroll-lock behavior. These checks make no production requests or mutations.
- The earlier `integrated/*` screenshots were captured with Chrome 108 and are not accepted color-rendering evidence for the current Tailwind build. Final browser review must use the modern Chromium runtime and isolated review API; authenticated modal and responsive layout review remains part of the root integration pass.

## Integrated browser verification — 12 September 2026

The root integration pass verified the current UI with Chromium 149 against the isolated review API, at desktop 1440px, mobile 390px and 360px, and landscape 720 × 450px. The review confirmed all 14 equipment slots, all four research disciplines, profile-dialog focus return, and mobile saved-search drawer focus return. No JavaScript errors were observed. The obsolete Chrome 108 captures are discarded; the root pass supplies the replacement `integrated-` captures.

Final cleanup removes only unused imports from the profile, equipment, and trait modules. Existing state, hook dependencies, handlers, and calculations remain unchanged.
