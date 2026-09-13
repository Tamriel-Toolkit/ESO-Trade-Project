# ESO Marketplace — Gilded Exchange

## Approval and scope

On **6 September 2026**, the owner approved concept **C — Gilded Exchange** as the desired general vibe, authorized the **full restyle plus rename**, and selected **ESO Marketplace** as the user-facing product name. This supersedes the pending-direction gate in earlier concept artifacts. A/B remain historical comparisons. The owner has not yet approved the final integrated app.

Reference: [C composition and captures](design/issue-132/README.md) and [integrated implementation review](design/issue-132/IMPLEMENTATION.md). Delivery umbrella: [#132](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/132); shared foundations: #104; page coverage: #119–131. The component-test foundation associated with #80 is included in this delivery: Vitest, React Testing Library, a DOM environment, shared setup, and 66 passing checks across eight suites. This evidence does not automatically close #80 or the individual page issues; their acceptance remains subject to review.

## Identity

The signature is charcoal-and-gold metalwork, recognizable ESO item art, Cinzel identity, and aligned trading information. It should feel like a crafted guild trading house with a practical working interface. Preserve the ESO square and existing icon language; no new logo or official endorsement is introduced.

| Token | Value | Use |
| --- | --- | --- |
| Background | `#111214` | Main canvas |
| Recess | `#0b0c0e` | Inputs and icon wells |
| Card | `#19191b` | Main content surfaces |
| Secondary | `#202022` | Raised/selected group surfaces |
| Foreground | `#efe5cf` | Main content |
| Muted foreground | `#afa797` | Secondary text |
| Primary | `#e6c15a` | Gold identity, selection, and prices |
| Primary foreground | `#171510` | Text on gold buttons |
| Border | `#403c33` | Decorative separators |
| Input boundary | `#8c806b` | Essential field edges |
| Focus | `#e6c15a` | Unobscured keyboard outline |

Tokens are declared in `frontend/src/styles/tokens.css` and exposed through Tailwind v4 semantic utilities. ESO quality/alliance/status colors retain textual labels; they are not interchangeable brand accents. Fine separators are decorative; essential controls need stronger boundaries.

## Typography, composition, and motion

- Self-hosted Cinzel 400/600 for brand, page titles, and a limited number of section headings. Sans-serif for item names, body, fields, utility menus, and numeric comparisons. System font fallbacks remain available.
- Body/control 14–16px; secondary text 12–14px; section headings 18–22px; responsive page headings 28–36px. Use tabular numerals for quantities/prices. Preserve long authored names by wrapping, not shrinking into microtext.
- Shared container and 16–32px responsive gutters; small spacing steps 4/8/12/16/24/32px. Cards apply padding once. Dense offer cards do not inherit the former empty 32px root bands.
- Home uses the approved two-part guild marketplace/merchandise composition. Marketplace prioritizes search and compact offers. Requests prioritize specifications, offer, status, and role-dependent actions. Builds emphasize titles, set lists, and comparison data. Characters emphasize identity and readable equipment. Trait research remains a labeled matrix, not an ornamental picture.
- Brief 120–200ms color/border feedback; no perpetual ambient motion, lift, or glow. Reduced motion disables decorative transitions while keeping visible focus/selection. Status, pending, errors, and copied states keep meaningful text.
- Dialogs remain the same workflows, with viewport-bounded scrolling and reachable close/actions. Preserve existing information and improve keyboard/touch access. Responsive layout must never remove refinements or action destinations.

## Naming and copy

Use **ESO Marketplace** for app branding, the document title, account references, and the branded portion of existing generated clipboard messages. Keep **ESOTrade** for the addon; existing API/storage/package identifiers and Tamriel geography are unchanged. Do not rewrite user-authored build names, requests, handles, or item descriptions.

Prefer concise task wording: Marketplace, Requests, My orders, Characters, Trait research, View equipment, Sign in. Preserve observed/recorded, unit/stack costs, timestamps, estimates, and other material qualifications. Do not imply guaranteed stock, official endorsement, successful sync, or capabilities the existing state does not establish.

## Verification contract

Before handoff, inventory retained controls and business behavior; run component tests, production build, and lint; review all routes and representative populated/empty/error/dialog states at 390/1440px with intermediate, short, and narrow widths. Check keyboard/focus, reduced motion, original icon delivery, overflow, and price/count semantics. Record real results and pre-existing failures; do not equate snapshots or direction approval with measured usability or final owner acceptance.

Test setup follows [Vitest configuration](https://vitest.dev/config/) and [React Testing Library setup](https://testing-library.com/docs/react-testing-library/setup/). Tests and browser review use isolated existing reference data, never seeded production market records.
