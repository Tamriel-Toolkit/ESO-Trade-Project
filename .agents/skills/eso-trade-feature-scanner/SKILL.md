---
name: eso-trade-feature-scanner
description: >-
  Deeply scans the ESO Trade Project repository (RyanS4/ESO-Trade-Project) for
  feature expansion opportunities, UX/UI improvements, ESO domain capabilities,
  smart market recommendations, and gameplay integration workflows. Runs strictly
  in Read-Only / Output-Only mode to present structured feature proposals, user
  journeys, and architecture blueprints directly to the user for review.
---

# ESO Trade Project — Feature & UX Opportunity Scanner Skill

Use this skill whenever asked to "find new feature ideas", "scan for UX/UI improvements", "propose new roadmap features", "explore gameplay integration opportunities", or "architect new domain capabilities".

---

## 🔒 Inviolable Operating Constraint: Read-Only / Output-Only Mode

> [!IMPORTANT]
> **READ-ONLY DISCOVERY MODE**: This skill is strictly designed for **feature discovery, opportunity analysis, and concept drafting**.
> When executing this skill:
> - **DO NOT** modify, edit, create, or delete any source code files.
> - **DO NOT** call GitHub MCP write tools (`create_pull_request`, `issue_write`, etc.) to open issues or PRs automatically.
> - **MUST ONLY** output your structured proposals, user journeys, architectural blueprints, and acceptance criteria directly to the user in chat or an artifact report (`feature_proposals.md` / `ux_opportunities.md`).

---

## 🏛️ Inviolable Core System Constraints

All feature proposals must strictly obey the core engineering rules in [`.agents/AGENTS.md`](file:///c:/Users/Blake/OneDrive/Desktop/ESO-Trade-Project/.agents/AGENTS.md):

1. **100% Data Authenticity**: Never propose synthetic, hallucinated, or placeholder market data generation. Static catalog features use UESP metadata; live market features use native ESOTrade addon scans or explicit user-entered gold values.
2. **Search Criteria Guarantee**: If a listing exists in the database, users searching via name or category filters must discover it instantly.
3. **ZOS TOS Compliance**: The in-game Lua addon (`ESOTrade.lua`) must only use official, read-only ESO API hooks (`EVENT_TRADING_HOUSE_RESPONSE_RECEIVED`). No memory injection, direct network calls in Lua, or automation of gameplay actions.
4. **Security & Parameterized SQL**: Dynamic queries must use parameterized SQL (`?` placeholders). Never propose unparameterized string concatenation for queries.

---

## 🧭 Feature Exploration Vectors & Domains

Systematically explore opportunities across four core pillars:

### 1. Market Intelligence & Commerce
- **Deal & Flip Detection**:
  - Value index algorithms calculating profit margins (`margin = avg_price - unit_price - (avg_price * 0.08)` for listing taxes).
  - Undervalued items alerting and "Sniping" feeds for fast-selling items.
  - Price deviation sparklines and historical price trend charts (7d, 30d, 90d).
- **Guild Trader Geography & Routing**:
  - Interactive ESO Guild Trader Hub Map (Grahtwood, Deshaan, Stormhaven, Vvardenfell, Craglorn).
  - Location-based shopping lists ("What should I buy while visiting Rawl'kha?").
  - Kiosk price heatmaps identifying the cheapest trading hubs for specific item types.
- **Want-To-Buy (WTB) & Want-To-Sell (WTS) Commerce**:
  - Player-to-player custom crafting order boards.
  - Automated Want-To-Trade (WTT) inventory matchers identifying mutual duplicates between users.

### 2. Character, Crafting & Build Intelligence
- **Trait Research & Kiosk Matcher**:
  - Cross-references character unresearched traits with active low-cost market listings.
  - Generates single-click "Buy to Research" shopping routes.
- **Smart Build & Loadout Importer**:
  - Import build gear lists from UESP Build Editor or popular build guides (e.g., AlcastHQ, SkinnyCheeks).
  - Evaluates user inventory and equipped gear to calculate remaining items, traits, and total gold needed to complete the build.
- **Collection & "Sticker Book" Completion Engine**:
  - Visual completion tracker for motifs, furnishing plans, and recipes.
  - Calculates "Total Gold to 100% Completion" using current live market price averages.
- **Transmute & Reconstruction Optimizer**:
  - Evaluates whether it is cheaper to reconstruct gear via Transmute Crystals or purchase uncollected pieces from kiosks.

### 3. UX, Visual Polish & Design System
- **Elder Scrolls Fantasy Theme Fidelity**:
  - Parchment textures, gold filigree accents, custom Elder Scrolls class/alliance crests.
  - Enhanced item rarity styling (Legendary Gold `#e5be59`, Epic Purple `#a335ee`, Superior Blue `#0070dd`, Fine Green `#2dc50e`).
- **Interactive Tooltips & Previews**:
  - Rich hover tooltips for equipment and weapons displaying set bonuses (2pc, 3pc, 4pc, 5pc), glyph enchantments, and trait descriptions.
  - Interactive 3D/2D model or icon previews for furnishings and motifs.
- **Power-User Navigation & Accessibility**:
  - Keyboard shortcuts (`/` for instant search focus, `ESC` to close modals, `J`/`K` for keyboard row navigation).
  - Responsive multi-device layout with virtualized table scrolling (`react-window`) for instant 10,000+ row rendering.

### 4. In-Game Addon & Desktop Daemon Synergy
- **Automated Trigger Enhancements**:
  - Sync triggers on trading house open (`EVENT_OPEN_TRADING_HOUSE`) and zone transitions (`EVENT_PLAYER_ACTIVATED`).
  - Automatic inventory bag & bank snapshot capture on bank closure.
- **Sync Daemon (`watcher.py`) UX**:
  - System tray icon with live scan counter, desktop push notifications for price alerts, and one-click sync status.

---

## 📋 Standardized Feature Proposal Format

When drafting feature proposals for the user, present each opportunity using this structured blueprint:

```markdown
# 💡 Feature Proposal: [Feature Name]

## 1. Overview & Value Proposition
- **Target Audience**: (Traders / Master Crafters / Build Theorycrafters / Casual Players)
- **Problem Statement**: What friction point or missing capability does this solve?
- **Core Value**: Why is this feature high-impact for the ESO Trade platform?

## 2. User Journey & UI Workflow
1. User navigates to `[Page / Component]`.
2. User performs `[Action / Filter]`.
3. System calculates `[Algorithm / Matching Engine]`.
4. UI presents `[Visual Cards / Badges / Action Buttons]`.

## 3. End-to-End Architecture Blueprint
- **Database Schema**: New tables, columns, or indexes required.
- **Backend API**: New or modified REST endpoints (method, path, request/response payload).
- **Frontend Components**: New JSX components, state management hooks, and theme integration.
- **Data Pipeline / Addon**: Required Lua API hooks or Python parsing routines.

## 4. Acceptance Criteria & Test Strategy
- [ ] Schema migrations execute cleanly without data loss.
- [ ] API endpoint implemented with input validation and rate limiting.
- [ ] React UI component fully responsive and dark-fantasy themed.
- [ ] Unit & integration tests pass with 100% coverage.

## 5. Estimated Effort & Priority Tier
- **Complexity**: (Low / Medium / High / Epic)
- **Estimated Time**: (e.g. 2–3 days)
- **Recommended Priority**: (P1 High / P2 Medium / P3 Low)
```

---

## 💡 Triage & Next Actions

Always present proposals to the user for review. If approved by the user, coordinate with the `eso-trade-issue-creator` skill to formally file the feature onto the [Master Tracking Issue #35](https://github.com/Tamriel-Toolkit/ESO-Trade-Project/issues/35) roadmap.
