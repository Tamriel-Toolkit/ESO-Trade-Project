# ESO Marketplace — Gilded Exchange

## Approval and scope

On **6 September 2026**, the owner approved concept **C — Gilded Exchange** as the desired general vibe, authorized the **full restyle plus rename**, and selected **ESO Marketplace** as the user-facing product name. On **15 September**, the owner authorized upgrading the running app to the constructed version. A/B remain historical comparisons. Shipping approval does not waive outstanding technical accessibility or individual issue acceptance checks.

Reference: [C composition and captures](design/issue-132/README.md), [integrated implementation review](design/issue-132/IMPLEMENTATION.md), and [15 September follow-up](design/issue-132/FOLLOWUP.md). Delivery umbrella: [#132](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/132); shared foundations: #104; page coverage: #119–131. The component-test foundation associated with #80 is included in this delivery: Vitest, React Testing Library, a DOM environment, shared setup, and 71 passing checks across nine suites. This evidence does not automatically close #80 or the individual page issues; their acceptance remains subject to review.

**Approved scope exception:** retire user-facing Item Catalog browsing and its promotional counts. Marketplace now shows guild trader listings only. Keep the internal item metadata, taxonomy, icons, set lookup, and request/build item selection that support existing workflows. Legacy catalog links and presets open listings with their other filters preserved.

## Identity

The signature is charcoal-and-gold metalwork, recognizable ESO item art, Cinzel identity, and aligned trading information. It should feel like a crafted guild trading house with a practical working interface. Preserve the ESO square and existing icon language; no new logo or official endorsement is introduced.

| Token | CSS Variable / Tailwind Utility | Value | Use |
| --- | --- | --- | --- |
| Background | `--background` / `bg-background` | `#111214` | Main canvas |
| Recess | `--recess` / `bg-recess` | `#0b0c0e` | Inputs and icon wells |
| Card | `--card` / `bg-card` | `#19191b` | Main content surfaces |
| Secondary | `--secondary` / `bg-secondary` | `#202022` | Raised/selected group surfaces |
| Surface Elevated | `--surface-elevated` / `bg-surface-elevated` | `#26241d` | Warm hover/active row and tab highlight surface |
| Surface Subtle | `--surface-subtle` / `bg-surface-subtle` | `#171719` | Recessed equipment and summary wells |
| Foreground | `--foreground` / `text-foreground` | `#efe5cf` | Main content |
| Muted foreground | `--muted-foreground` / `text-muted-foreground` | `#afa797` | Secondary text |
| Primary | `--primary` / `text-primary`, `bg-primary` | `#e6c15a` | Gold identity, selection, and prices |
| Primary foreground | `--primary-foreground` / `text-primary-foreground` | `#171510` | Text on gold buttons |
| Primary hover | `--primary-hover` / `bg-primary-hover`, `text-primary-hover` | `#f0d07a` | Interactive gold hover state and emphasized totals |
| Primary inset | `--primary-inset` / `border-primary-inset` | `#9e8139` | Inner bevel frame on primary gold actions |
| Border | `--border` / `border-border` | `#403c33` | Decorative separators |
| Border accent | `--border-accent` / `border-border-accent` | `#867044` | Warm gold card hover and ornamental frame border |
| Border subtle | `--border-subtle` / `border-border-subtle` | `#665132` | Subtle warm gold border for timers, badges, and plinths |
| Input boundary | `--input` / `border-input` | `#8c806b` | Essential field edges |
| Focus | `--ring` / `outline-ring` | `#e6c15a` | Unobscured keyboard outline |

### ESO Item Quality, Status, and Alliance Tokens

All semantic foreground, status, and ESO quality tokens maintain $\ge 4.5:1$ contrast across `--background`, `--recess`, `--card`, `--secondary`, and `--surface-elevated`:

| Category | Token | CSS Variable / Tailwind Utility | Value | Use |
| --- | --- | --- | --- | --- |
| Quality 1 (Normal / Trash) | Normal | `--quality-normal` / `text-quality-normal`, `border-quality-normal` | `#d1d5db` | Normal quality item labels and borders |
| Quality 2 (Fine) | Fine | `--quality-fine` / `text-quality-fine`, `border-quality-fine` | `#4ade80` | Fine (green) item labels and borders |
| Quality 3 (Superior) | Superior | `--quality-superior` / `text-quality-superior`, `border-quality-superior` | `#60a5fa` | Superior (blue) item labels and borders |
| Quality 4 (Epic) | Epic | `--quality-epic` / `text-quality-epic`, `border-quality-epic` | `#c084fc` | Epic (purple) item labels and borders |
| Quality 5 (Legendary) | Legendary | `--quality-legendary` / `text-quality-legendary`, `border-quality-legendary` | `#e6c15a` | Legendary (gold) item labels and borders |
| Status | Success / Deal | `--status-success` / `text-status-success` | `#81d6a1` | Below-average deal indicators and completion feedback |
| Status | Warning / Stale | `--status-warning` / `text-status-warning` | `#f0c36d` | Stale scan warnings and expiring claim timers |
| Status | Info | `--status-info` / `text-status-info` | `#7dd3fc` | Fresh scan timestamps and informational badges |
| Status | Destructive | `--destructive` / `text-destructive` | `#fb9292` | Error banners and destructive actions |
| Alliance | Aldmeri Dominion | `--alliance-ad` / `text-alliance-ad` | `#e6c15a` | Aldmeri Dominion semantic accent |
| Alliance | Ebonheart Pact | `--alliance-ep` / `text-alliance-ep` | `#f87171` | Ebonheart Pact semantic accent |
| Alliance | Daggerfall Covenant | `--alliance-dc` / `text-alliance-dc` | `#60a5fa` | Daggerfall Covenant semantic accent |

### Control Height and Spacing Scales

- **Control heights**: `--control-xs` (`32px` / `2rem`), `--control-sm` (`36px` / `2.25rem`), `--control-md` (`40px` / `2.5rem`), `--control-lg` (`44px` / `2.75rem`).
- **Spacing steps**: `--space-1` (`4px`), `--space-2` (`8px`), `--space-3` (`12px`), `--space-4` (`16px`), `--space-6` (`24px`), `--space-8` (`32px`).

Tokens are declared in `frontend/src/styles/tokens.css` and exposed through Tailwind v4 `@theme inline` semantic utilities. ESO quality/alliance/status colors retain textual labels; they are not interchangeable brand accents. Fine separators are decorative; essential controls need stronger boundaries.

### Token Migration Status & Follow-Up Inventory (#104)

- **Fully migrated to semantic tokens (zero raw hex literals)**:
  - All shared stylesheets: `frontend/src/index.css`, `frontend/src/styles/exchange.css`, `frontend/src/styles/home.css`, `frontend/src/styles/marketplace.css`, `frontend/src/styles/requests-builds.css`, and `frontend/src/styles/characters.css`.
  - All shared UI primitives (`frontend/src/components/ui/*.jsx`, with `alliance-icons.jsx` retaining only intrinsic SVG crest artwork fills/strokes).
  - Core pages and modals: `Home.jsx`, `Marketplace.jsx`, `Login.jsx`, `RequestBoard.jsx`, `MyOrders.jsx`, `BuildExplorer.jsx`, `BuildPlanner.jsx`, `RequestCard.jsx`, `BuildCreatorModal.jsx`, and `BuildDetailModal.jsx`.
- **Inventoried inline JSX hex classes deferred to dedicated page acceptance issues**:
  - `frontend/src/pages/CharacterManager.jsx` (99 arbitrary hex class occurrences) and `frontend/src/components/character/CharacterProfileModal.jsx` (52 occurrences) → tracked under **[#129](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/129)** (*Restyle Character Manager roster, creation dialog, and profile modal*).
  - `frontend/src/components/character/AnatomicalEquipmentDiagram.jsx` (83 occurrences) and `frontend/src/pages/TraitTracker.jsx` (96 occurrences) → tracked under **[#130](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/130)** (*Redesign Anatomical Equipment Diagram and Trait Research Matrix*).

## Typography, composition, and motion

- Self-hosted Cinzel 400/600 for brand, page titles, and a limited number of section headings. Sans-serif for item names, body, fields, utility menus, and numeric comparisons. System font fallbacks remain available.
- Body/control 14–16px; secondary text 12–14px; section headings 18–22px; responsive page headings 28–36px. Use tabular numerals for quantities/prices. Preserve long authored names by wrapping, not shrinking into microtext.
- Shared container and 16–32px responsive gutters; small spacing steps 4/8/12/16/24/32px. Cards apply padding once. Dense offer cards do not inherit the former empty 32px root bands.
- Marketplace field labels reserve an 8px gap above controls, clear of the 2px focus outline plus its 3px offset. Do not fix label overlap by hiding or clipping keyboard focus.
- Home uses the approved two-part guild marketplace/merchandise composition. Marketplace prioritizes search and compact offers. Requests prioritize specifications, offer, status, and role-dependent actions. Builds emphasize titles, set lists, and comparison data. Characters emphasize identity and readable equipment. Trait research remains a labeled matrix, not an ornamental picture.
- Brief 120–200ms color/border feedback; no perpetual ambient motion, lift, or glow. Reduced motion disables decorative transitions while keeping visible focus/selection. Status, pending, errors, and copied states keep meaningful text.
- Dialogs remain the same workflows, with viewport-bounded scrolling and reachable close/actions. Preserve existing information and improve keyboard/touch access. Responsive layout must never remove refinements or action destinations.

## Naming and copy

Use **ESO Marketplace** for app branding, the document title, account references, and the branded portion of existing generated clipboard messages. Keep **ESOTrade** for the addon; existing API/storage/package identifiers and Tamriel geography are unchanged. Do not rewrite user-authored build names, requests, handles, or item descriptions.

Prefer concise task wording: Marketplace, Requests, My orders, Characters, Trait research, View equipment, Sign in. Preserve observed/recorded, unit/stack costs, timestamps, estimates, and other material qualifications. Do not imply guaranteed stock, official endorsement, successful sync, or capabilities the existing state does not establish.

## Verification contract

Before handoff, inventory retained controls and business behavior; run component tests, production build, and lint; review all routes and representative populated/empty/error/dialog states at 390/1440px with intermediate, short, and narrow widths. Check keyboard/focus, reduced motion, original icon delivery, overflow, and price/count semantics. Record real results and pre-existing failures; do not equate snapshots or direction approval with measured usability or final owner acceptance.

Test setup follows [Vitest configuration](https://vitest.dev/config/) and [React Testing Library setup](https://testing-library.com/docs/react-testing-library/setup/). Tests and browser review use isolated existing reference data, never seeded production market records.
