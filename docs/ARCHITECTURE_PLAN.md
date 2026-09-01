# Architecture Plan

## Data ownership

```text
UESP export -> items.json -> safe catalog upsert -> items
ESOTrade.lua -> native parser/upload -> guild_trader_listings
items.icon_url -> /api/icons/:filename -> disk cache or local fallback
```

UESP supplies static item identity, taxonomy, set metadata, and source icon paths. It is not a live market source. The native ESOTrade addon is the only live listing source.

## Application layers

- React/Vite renders catalog browsing, native listing observations, characters, builds, and trade requests.
- Express validates API input, authenticates writes, calculates native observation aggregates, and owns icon delivery.
- SQLite stores local development and single-node application data.
- The data pipeline refreshes catalog data through conflict-safe upserts and ingests native SavedVariables scans.

## Invariants

- A catalog refresh must never drop `items` or cascade-delete user data.
- The browser must never fetch item images directly from an upstream host.
- Icon requests accept a validated basename and use a fixed source host.
- Live market claims must be backed by native addon observations or explicit user-entered gold values.
