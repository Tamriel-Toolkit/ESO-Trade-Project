# Issue #132 — Visual direction review

Phase 1 of [#132](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/132): two distinct visual directions for Tamriel Trade Hub, using the same historical reference data across Home, Marketplace, and Characters. These are isolated, interactive composition samples—not a completed application restyle.

**Owner approval is required before broad implementation.** Review both directions on desktop and mobile, then record the selected direction or an explicitly defined combination in #132. The concept PR does not close #132. Its remaining application-wide acceptance criteria and rollout work stay open.

## The decision

Both directions retain an ESO-inspired atmosphere through restrained serif typography, engraved linework, and a considered material palette. Neither relies on copying the game's interface, adding ornamental panels around every element, or making all text gold and uppercase. The intended hierarchy is task first, useful context second, decoration last; this is a design intention, not a measured usability result.

| Design dimension      | A — Guild Ledger                                                                                                                       | B — Obsidian Atlas                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signature             | An editorial merchant's ledger: warm, ruled, and precise.                                                                              | An engraved field atlas: dark, spatial, and atmospheric.                                                                                            |
| Palette               | Stone paper `#f5f2eb`, charcoal ink `#292a26`, dark navigation `#272c28`, oxblood `#763d37`, restrained brass `#9a7947`.               | Deep ink `#101b1e`, slate surfaces `#18272b`, limestone text `#e9e7dc`, brass `#c1ae85`, pale teal `#9bc8bd`.                                       |
| Typography            | Serif headlines and item names give the page an editorial rhythm; sans-serif controls and metadata keep trading information practical. | Serif headlines provide atmosphere; sans-serif listing names, controls, and equipment metadata emphasize the working interface.                     |
| Composition           | A dark masthead over a light document; fine ledger rules, indexed categories, aligned trading columns, and a compact equipment record. | A dark continuous canvas; abstract contour artwork, spacious section boundaries, quiet trading rows, and an equipment diagram beside the gear list. |
| Interaction treatment | Oxblood emphasis, a narrow row-hover marker, small link movement, and a short entrance transition.                                     | Teal selection marks, subtle surface changes, and small directional-link movement; no ambient or perpetual animation.                               |

Both use local serif/system font stacks—Georgia and an Inter/Segoe UI/Arial fallback stack—not a downloaded font dependency. Both include visible keyboard-focus styling and reduced-motion overrides. The palette values and type choices are concept proposals; approved production tokens will be defined through #104.

### What to evaluate

- **Home:** Does the identity feel distinctive while making Marketplace and Characters easy to recognize? Does the artwork support the composition without delaying access to useful content?
- **Marketplace:** Can item identity, unit price, per-stack cost, stack count, seller/trader, and observation time be distinguished quickly? Compare the long item names and the three stacks of Tide-Born Feathers.
- **Characters:** Is the selected character clear, and is equipment readable without decorative elements competing with item information? Compare both weapon bars.
- **Mobile:** Check the same information hierarchy, long-name wrapping, navigation, controls, and item-detail dialog at the narrow width. Review the Marketplace loading, empty, and error treatments separately.

Approval should state the chosen palette, typography, ornament style, and density—not merely a preference for one screenshot. A combination is possible, but its boundaries must be explicit so subsequent pages form one identity. Approval of these compositions does not approve missing production states or alter existing workflows.

### How the language extends across the app

| Existing surface                  | Guild Ledger treatment                                                                                                                                     | Obsidian Atlas treatment                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Requests / My Orders              | A work ledger: specification, offer, participant, and current action aligned in stable bands. Oxblood is reserved for the primary action, not every badge. | Slate work surfaces: offer and status are distinct focal points; a small textual status with a teal selection edge replaces ornamental badge clusters. |
| Builds / comparison               | Editorial build titles and readable set lists; comparisons use ruled rows with aligned numerals.                                                           | Compact equipment groupings with spatial section markers; the same numerical alignment as the trading interface.                                       |
| Forms / sign-in / dialogs         | Paper-like single surfaces, explicit sans-serif labels, errors beside their fields. No nested faux parchment panels.                                       | One elevated slate surface, persistent labels, quiet separators. Brass is not used as the default border around every input.                           |
| Trait matrix                      | A research record with strong row/column labels and readable text/status symbols.                                                                          | A grid of restrained slate cells; state text and symbols remain visible independently of color.                                                        |
| Account utilities / system states | Compact typography, quiet dividers, local action feedback.                                                                                                 | The same compact rhythm and clear feedback on the slate surface.                                                                                       |

The repeatable signatures are the **masthead/document rhythm, indexed ledger rules, and aligned price columns** in A; and the **diamond selection marker, engraved geometry, and spatial equipment grouping** in B. Ornament belongs in the opening composition or character illustration, not behind form text, in every result row, or across a research matrix. Keep the existing product name; these direction names are review labels, not a rebrand or new logo proposal.

For implementation, use short 120–200ms color/surface transitions. Selection must retain a visible mark without motion. Keyboard focus uses an offset outline; pending, error, success, and copied states retain explicit text and stable control dimensions. Preserve native control semantics and current modal workflows, restore focus after closing, and never make important information hover-only. No looping glows, card levitation, decorative loading delays, or new gestures. #104 will consolidate the chosen rules into production tokens and primitives; these two isolated stylesheets must not become competing production themes.

## Run and compare

From the repository root, start the dependency-free, loopback-only preview server:

```powershell
node docs/design/issue-132/serve.cjs
```

Open [the comparison harness](http://127.0.0.1:5132). Use the A/B buttons, screen selector, and full-width/390px selector to compare like-for-like views. **Open full preview** removes the surrounding comparison frame. The upper review controls are review tooling, not proposed application UI. Stop the server with `Ctrl+C`.

The shared preview demonstrates screen navigation, reference-item search and category filtering, listing details, weapon-bar selection, and Marketplace state samples. Controls that only demonstrate appearance are identified as read-only or preview-only. They must not be interpreted as implemented application handlers. The server only serves an explicit allowlist of preview assets; it provides no application API.

Run the included local checks with:

```powershell
node --test docs/design/issue-132/preview.test.cjs
```

These checks cover reference-data invariants, the shared preview contract, and isolation from service/session/storage integrations. They do not establish user comprehension, complete accessibility conformance, production behavior parity, or completion of #132. Verified browser results and any limitations should accompany the review handoff.

## Data and asset boundaries

`fixtures.js` contains a read-only snapshot captured on **5 September 2026** from existing local SQLite records: nine listing groups observed on **3 September 2026**, one synced character, and twelve recorded equipment entries across both weapon bars. The same records power both directions. They are historical examples, not current availability, generated market activity, or a replacement data source.

The Tide-Born Feathers example deliberately preserves the distinction between **2,100g per item**, **100 items per stack**, **210,000g per stack**, and **three stacks / 300 items**. A visual redesign must not change those meanings or the underlying listing aggregation.

- No application API requests, authentication integration, browser storage, or database writes are performed by the preview.
- No production files, routes, application styles, handlers, or data pipelines are changed by this concept package.
- Generic category symbols are visual placeholders for missing reference icon assets, not fabricated item artwork. Production item icons must continue to use the existing backend icon-cache pipeline.
- The compass, contours, and character linework are code-native decorative illustrations. The abstract atlas is not a game map, route planner, or location feature; the figure is not a newly proposed equipment interaction.
- No credentials, tokens, or private account-contact fields are included. Listing seller handles and character details are reference-record content.

## Implementation contract after approval

These are **composition samples**, not proposals for new routes, alternate navigation modes, feature removals, or new functionality. The comparison harness and its state selectors do not ship with the application. A composition's selected-character view is not permission to replace the existing character workflow; likewise a read-only catalog control is not permission to remove catalog access.

Production implementation must retain all existing destinations, permission checks, actions, handlers, options, filtering and sorting semantics, saved-search behavior, pagination, calculations, data fields, and loading/empty/error states. Any abbreviated fixture or disabled demonstration control must be connected to its complete existing counterpart. Responsive styling must not make required information or actions unavailable. Copy can be shortened without making stronger claims about listing freshness or availability.

The approved direction becomes a shared specification through #104, then is applied consistently across the existing page tickets. Keep #104's existing #80 dependency. **Do not make completion/closure of umbrella #132 a prerequisite for its child work**; the recorded direction approval is the design handoff, while final umbrella closure follows completed implementation and verification.

### Rollout completion checklist

All remain unchecked in this concept phase:

- [ ] Owner approves a documented direction in #132.
- [ ] #104 — Shared visual/editorial foundations, tokens, and primitives.
- [ ] #119 — Navigation, settings, and account surfaces.
- [ ] #120 — Home.
- [ ] #121 — Marketplace controls and saved searches.
- [ ] #122 — Listing cards and item details.
- [ ] #123 — Requests and My Orders pages.
- [ ] #124 — Request cards.
- [ ] #125 — Request creation form.
- [ ] #126 — Build gallery.
- [ ] #127 — Build details and comparison.
- [ ] #128 — Build creation and set picker.
- [ ] #129 — Character roster, profiles, and shared equipment presentation.
- [ ] #130 — Trait tracker.
- [ ] #131 — Sign-in, registration, not-found, and developer-account surfaces.
- [ ] Cross-page desktop/mobile, keyboard, focus, contrast, reduced-motion, long-content, and state review completed against real application behavior.
- [ ] Owner reviews the integrated identity; #132's full acceptance criteria are satisfied before closure.

The checklist describes delivery coverage, not new functionality or a replacement priority queue. GitHub tracking issue #35 remains authoritative for execution status and dependencies.

## Verification record — 5 September 2026

- `node --test docs/design/issue-132/preview.test.cjs`: **5 passed**. Includes eight principal text/palette pairs at a minimum 4.5:1 contrast ratio, reference-price/quantity invariants, and asset/behavior isolation checks. This is not a complete rendered contrast audit.
- Headless system Chrome, isolated browser context: **36 screen/viewport checks passed** across both directions, all three screens, 360/390/768/1024/1440px widths, plus a short 720×450 effective viewport at 2× device scale. No page-level horizontal overflow or JavaScript errors were found in those runs.
- Keyboard activation, modal background focus exclusion, Escape/return focus, search, all eight category choices, reset, Home-to-category context, both weapon bars, and loading/empty/error samples passed. The iframe comparison controls remain synchronized after navigation within a concept.
- Reduced-motion check found no running animations in the short-viewport samples. Dialog close actions remain reachable there. The server rejects non-GET/HEAD requests and files outside its allowlist; browser checks found no remote requests or mutation calls.
- Twelve desktop/mobile concept captures were generated and visually inspected; three original owner-supplied screenshots are retained for comparison. Early category-layout, glyph-contrast, filter visibility, and weapon-bar inconsistencies were corrected during review.
- Unmodified production frontend: `npm run build` **passed**, with existing chunk-size and mixed static/dynamic API-import warnings. `npm run lint` **fails at baseline** on the conditional `useEffect` in `frontend/src/components/dev/DevAccountModal.jsx:95`, plus existing warnings. Frontend content matches the base commit; this documentation-only PR does not modify that component or fix unrelated lint errors.

Optional browser verification (requires Playwright and system Chrome, separate from application dependencies):

```powershell
# With serve.cjs running; set PLAYWRIGHT_MODULE to an available Playwright module
# path only when it is not resolvable normally. No package.json changes required.
node docs/design/issue-132/browser-check.cjs
```

Limitations: no owner first-impression/usability session, screen-reader audit, manual browser-menu 200% zoom check, other-browser certification, full production-state coverage, or final owner approval has occurred. The 2× effective-viewport check is not claimed as a manual browser zoom test. These remain part of the approved-direction implementation and final review; no umbrella acceptance checkbox is marked complete by this artifact.

### Captures

The “before” images are the owner's supplied screenshots, not recaptured production screens at a new build. Concept screenshots use historical records and do not imply deployment.

| Screen      | Before                                      | A desktop                                               | A mobile                                        | B desktop                                                | B mobile                                       |
| ----------- | ------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| Home        | [Original](previews/before-home.png)        | [Guild Ledger](previews/ledger-home-desktop.png)        | [390px](previews/ledger-home-mobile.png)        | [Obsidian Atlas](previews/atlas-home-desktop.png)        | [390px](previews/atlas-home-mobile.png)        |
| Marketplace | [Original](previews/before-marketplace.png) | [Guild Ledger](previews/ledger-marketplace-desktop.png) | [390px](previews/ledger-marketplace-mobile.png) | [Obsidian Atlas](previews/atlas-marketplace-desktop.png) | [390px](previews/atlas-marketplace-mobile.png) |
| Characters  | [Original](previews/before-characters.png)  | [Guild Ledger](previews/ledger-characters-desktop.png)  | [390px](previews/ledger-characters-mobile.png)  | [Obsidian Atlas](previews/atlas-characters-desktop.png)  | [390px](previews/atlas-characters-mobile.png)  |
