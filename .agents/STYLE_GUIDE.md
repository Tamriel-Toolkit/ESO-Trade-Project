# ESO Marketplace — approved visual direction

Owner approval recorded 6 September 2026 in the issue #132 task: **C — Gilded Exchange** is the general visual direction for the entire web app. The owner explicitly requested the **full restyle plus rename**. The user-facing product name is **ESO Marketplace**, replacing Tamriel Trade Hub / ESO Trade Hub / ESO Trade Platform. Gilded Exchange is the internal design label, not the product name.

Use [docs/DESIGN_SYSTEM.md](../docs/DESIGN_SYSTEM.md) as the concrete implementation brief. The approved reference lives in `docs/design/issue-132/exchange.html` and its desktop/mobile captures. A/B are historical rejected alternatives, not competing themes.

- Keep the dark charcoal and golden-yellow ESO atmosphere, original item/equipment icons, Lucide family, and existing class/alliance icon identities.
- Use Cinzel for brand and limited display headings. Body, item names, controls, and data use readable sans-serif. Essential metadata is at least 12px; body/control text generally 14–16px.
- Use narrow metalwork edges and clipped corner marks sparingly, compact offers with aligned prices, and purposeful composition. Avoid generic dashboard cards, excessive boxes/glows, all-caps metadata, and inflated marketing copy.
- Preserve routes, permissions, all controls/states, filters, sorting, calculations, copy-command semantics, data and API behavior. Only the approved product-brand portion of generated copy changes.
- Do not rename the ESOTrade addon, saved-variable identifiers, repository/package identifiers, API paths, storage keys, or geographical mentions of Tamriel.
- Icons continue through `/api/icons/:filename`; do not replace game artwork with generated art or browser requests to upstream hosts.
- Approval of the direction is not final acceptance of the implemented app. #132 stays open for integrated review; no unrelated issue is automatically resolved.
