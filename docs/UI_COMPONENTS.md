# ESO Trade Design System — UI Components Documentation

This document serves as the official developer specification and component reference for the ESO Trade web client. All UI elements adhere to the Tamrielic dark fantasy design aesthetic (Cinzel typography, deep obsidian surfaces, and warm gold `#c5a059` / `#d4af37` accents) with WCAG-compliant accessibility and seamless responsiveness.

---

## Table of Contents
1. [Design Tokens & Theme Guide](#1-design-tokens--theme-guide)
2. [Standardized Custom Tooltip (`EsoTooltip`)](#2-standardized-custom-tooltip-esotooltip)
3. [Selection & Dropdown Components](#3-selection--dropdown-components)
4. [Cards, Badges & Interactive Matrix Elements](#4-cards-badges--interactive-matrix-elements)
5. [Accessibility & Best Practices](#5-accessibility--best-practices)

---

## 1. Design Tokens & Theme Guide

| Token | Hex / Class | Usage |
| :--- | :--- | :--- |
| **Primary Gold** | `#c5a059` / `text-[#c5a059]` | Primary brand headers, active tabs, buttons, focal borders |
| **Highlight Gold** | `#d4af37` / `text-[#d4af37]` | Price numbers, deals, high-contrast badges, hover states |
| **Background Dark** | `#0a0a0d` / `bg-[#0a0a0d]` | Global page background, deep input background |
| **Surface Card** | `#121218` / `bg-[#121218]` | Cards, modals, tooltips, dropdown menus |
| **Border Dark** | `#2a2c33` / `border-[#2a2c33]` | Subtle component dividers, inactive borders |
| **Parchment Light** | `#e0d8c3` / `text-[#e0d8c3]` | Primary legible body text |
| **Muted Grey** | `#8a8275` / `text-[#8a8275]` | Subtitles, metadata, timestamps |
| **Typography Header** | `font-cinzel` | Headers, tabs, titles, skill names, uppercase markers |
| **Typography Monospace** | `font-mono` | Gold amounts, item IDs, stack counts, timestamps |

---

## 2. Standardized Custom Tooltip (`EsoTooltip`)

The standard custom tooltip replaces generic OS `title="..."` attributes with collision-aware, styled floating cards powered by `@base-ui/react/tooltip`.

### Import
```jsx
import { EsoTooltip } from "@/components/ui/tooltip";
// or low-level primitives:
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
```

### Component API Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `children` | `ReactNode` | *(Required)* | The trigger element (button, icon, badge, text). |
| `content` | `ReactNode` \| `string` | *(Required)* | The main body text or JSX rendered inside the tooltip. |
| `title` | `string` | `undefined` | Optional uppercase gold header rendered at the top of the tooltip. |
| `shortcut` | `string` | `undefined` | Optional keyboard shortcut or tag badge displayed next to the title. |
| `side` | `"top"` \| `"bottom"` \| `"left"` \| `"right"` | `"top"` | Preferred alignment side relative to the trigger. |
| `align` | `"start"` \| `"center"` \| `"end"` | `"center"` | Alignment on the cross-axis. |
| `sideOffset` | `number` | `6` | Distance in pixels between the trigger and tooltip. |
| `delay` | `number` | `150` | Hover reveal delay in milliseconds. |
| `disabled` | `boolean` | `false` | When true, bypasses tooltip rendering entirely. |
| `className` | `string` | `""` | Additional Tailwind utility classes applied to the popup. |

### Code Examples

#### A. Basic Text Tooltip
```jsx
<EsoTooltip content="Clear all active listings and price records from the SQLite database">
  <Button variant="outline" size="sm">[DEV] Clear Database</Button>
</EsoTooltip>
```

#### B. Rich Tooltip with Title & Keyboard Shortcut
```jsx
<EsoTooltip 
  title="Trait Research Matrix" 
  content="Inspect all 324 trait research nodes for your character across Blacksmithing, Clothier, Woodworking, and Jewelry." 
  shortcut="Shift + T"
  side="bottom"
>
  <button className="p-2 border border-[#c5a059]/40 text-[#d4af37]">
    <Hammer className="size-4" />
  </button>
</EsoTooltip>
```

#### C. Equipment & Market Fodder Tooltip
```jsx
<EsoTooltip
  title="Powered — Axe (Missing)"
  content="Increases healing done. Available for 1,200g at Scourge Alliance kiosk in Mournhold. Click to open Market search."
  side="top"
>
  <button className="px-2 py-1 bg-[#161620] border border-[#2a2c33]">
    1,200g
  </button>
</EsoTooltip>
```

---

## 3. Selection & Dropdown Components

### `NativeSelect` (`@/components/ui/native-select`)
Optimized for high performance and mobile usability in filter control bars.

```jsx
<NativeSelect
  value={selectedTrait}
  onChange={(e) => setSelectedTrait(e.target.value)}
  className="w-full bg-[#0a0a0d] border-[#2a2c33] text-[#e0d8c3]"
>
  <NativeSelectOption value="">All Traits</NativeSelectOption>
  <NativeSelectOptGroup label="Weapon Traits">
    <NativeSelectOption value="Powered">Powered (Healing)</NativeSelectOption>
    <NativeSelectOption value="Divines">Divines (Mundus)</NativeSelectOption>
  </NativeSelectOptGroup>
</NativeSelect>
```

### `EsoSelect` (`@/components/ui/eso-select`)
Custom searchable combo-box dropdown styled with the ESO frame.

---

## 4. Cards, Badges & Interactive Matrix Elements

### Rarity Indicators
All items adhere to the canonical 5-tier ESO color palette:
- **Normal (White/Grey)**: `border-gray-600 text-gray-300 bg-gray-900/40`
- **Fine (Green)**: `border-green-600 text-green-400 bg-green-950/40`
- **Superior (Blue)**: `border-blue-600 text-blue-400 bg-blue-950/40`
- **Epic (Purple)**: `border-purple-600 text-purple-400 bg-purple-950/40`
- **Legendary (Gold)**: `border-[#c5a059] text-[#d4af37] bg-amber-950/40`

---

## 5. Accessibility & Best Practices

1. **Never use generic browser `title="..."` attributes for rich UI controls**: Use `<EsoTooltip>` instead to guarantee consistent styling, keyboard accessibility, and screen reader announcements.
2. **Interactive Click Targets**: Ensure all buttons and clickable cards have a minimum touch target size of `36px × 36px` on mobile and `cursor-pointer` styling.
3. **Contrast Compliance**: Text on `#121218` surfaces must use `#e0d8c3` (primary) or `#d4af37` (gold accents) to exceed WCAG AA 4.5:1 contrast ratios.
4. **Collision Avoidance**: Tooltip popups automatically flip and reposition within viewport bounds so they are never clipped by the window edges.
