# Contributing

## Data boundaries

- Use UESP only for static item identity, taxonomy, set metadata, and source icon paths.
- Use the native `ESOTrade.lua` SavedVariables file as the only live guild-listing source.
- Never create synthetic market listings or guild identities.
- Serve item images through the backend icon cache; frontend code must not hotlink source images.
- Catalog refreshes must upsert `items` without deleting user accounts, characters, builds, requests, or native listing observations.

## Development workflow

1. Install backend and frontend dependencies.
2. Copy environment settings into `backend/.env`.
3. Run the backend with `npm start` and the frontend with `npm run dev`.
4. Run `node backend/data-pipeline/test_api_endpoints.js` and `npm run build` before opening a pull request.
