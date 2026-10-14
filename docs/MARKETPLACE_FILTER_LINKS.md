# Marketplace links and saved searches

The Marketplace URL is the source of truth for listing criteria. Copy the address
to share a search; saving a search records the same normalized criteria. Results
remain live observations, so listing availability can change between visits.

## Query contract

| Parameter | Meaning |
| --- | --- |
| `server` | `NA` or `EU`. Always recorded, independent of the recipient's preference. |
| `platform` | Existing presentation preference (`PC`, `Xbox`, `PlayStation`). Always recorded; **not an API data partition**. This change does not add console ingestion. |
| `search` | Item-name substring; not a set-name lookup. Up to 160 characters. |
| `set` | Exact, case-insensitive catalog set name. Up to 160 characters. |
| `category`, `subcategory` | Existing catalog taxonomy. Category aliases `Armor`/`Weapon` normalize to `Apparel`/`Weapons`. Subcategory requires a category. |
| `slot` | `head`, `neck`, `chest`, `shoulders`, `hands`, `waist`, `legs`, `feet`, `ring`, `one-hand`, `two-hand`, `main-hand`, `off-hand`. |
| `weight` | `light`, `medium`, `heavy`. |
| `weapon` | `axe`, `mace`, `sword`, `greatsword`, `battleaxe`, `maul`, `bow`, `dagger`, `shield`, `inferno-staff`, `ice-staff`, `lightning-staff`, `restoration-staff`. |
| `trait` | A supported trait name, normalized to the control's capitalization. |
| `rarity` | Quality `1`–`5`. |
| `location` | Existing location substring filter. Non-preset locations remain visible in the selector. |
| `max_age` | Last seen within `1`, `3`, `7`, `14`, or `30` days. |
| `sort` | `value_index` (default), `trait_asc`, `trait_desc`, `rarity_asc`, `rarity_desc`, `price_asc`, `price_desc`, `newest`. |
| `deals`, `min_value_index` | `deals=1` activates deals-only. The effective positive threshold (up to 100) is recorded, e.g. `1.75`, so recipients' preferences cannot change matching results. |

Empty criteria and the default sort are omitted. Invalid enum/numeric values are
normalized to defaults; text values are bounded. Unrecognized subcategory/location
text remains visible rather than becoming a hidden constraint. Unrelated query
parameters, anchors, and router state survive normalization. Legacy `view=catalog`
links are replaced with `view=listings`; the catalog feature is not restored.
Legacy saved searches using `deals_only` and `view=catalog` remain usable.

## Navigation behavior

- A discrete control change, preset application, or reset creates one history entry.
- Typing starts one entry per editing session; further keystrokes replace that entry.
  Spaces remain editable. Leaving the field trims outer whitespace and ends the session.
- Back/Forward restores the full state, including clearing parameters absent from the URL.
- Filters and page-size changes reset pagination **before** a new query is committed.
  Pagination itself remains transient (not part of the shared URL).
- Canonicalization replaces an entry. It does not add a history step or refetch identical criteria.
- Explicit links win over initial preferences. Deliberately changing a global server,
  platform, or active deal-threshold preference updates the URL. The Marketplace's
  server selector edits the search itself without changing a global preference.
- Old in-flight responses cannot overwrite a newer search. Automatic refresh remains serialized.

## Exact equipment matching

`GET /api/market/listings` accepts `set`, `slot`, `weight`, and `weapon` alongside
its existing filters. Both the count and paginated result query use the same predicates.
Invalid equipment enum parameters return HTTP 400. All values are bound SQL parameters.

Set identity uses `items.set_name`, falling back to `metadata.set.name` for older
catalog rows. Equipment predicates use `metadata.raw.equip_type`, `armor_type`, and
`weapon_type`, **not item-name guesses**. These are catalog ESO enum values, not
character `BAG_WORN` slot IDs. Missing equipment metadata cannot confirm an exact
match and therefore does not match an explicit equipment constraint.

Build links use the recorded set and equipment labels. Research links map the
discipline's exact equipment line, including `Battleaxe`, robe/jerkin, armor slots,
and individual staff elements. A generic destruction-staff record only constrains
the family; it does not invent an element. Exact constraints appear as removable
chips alongside the existing filters.

Example: `/marketplace?server=EU&platform=PC&set=Deadly+Strike&category=Jewelry&subcategory=Ring&slot=ring&trait=Bloodthirsty`.

The addon API's distinction between EquipSlot, EquipType, ArmorType, and WeaponType
is documented in the [ESO UI API reference](https://github.com/esoui/esoui/blob/live/ESOUIDocumentation.txt).

## Verification

- `cd frontend; npm test` — round-trips, malformed/legacy URLs, history and parameter
  removal, saved searches, preferences, equipment links, and obsolete responses.
- `cd backend; npm test` — existing API/lifecycle suites plus isolated exact-match,
  metadata fallback, server, pagination-count, injection, validation, and saved-search tests.
- `cd frontend; npm run build` — production compilation.

Test fixtures are confined to disposable test databases. No catalog, listing,
SavedVariables, or account data needs migration or replacement for this feature.
