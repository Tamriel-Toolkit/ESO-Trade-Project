# ESO Marketplace — Frontend (React 19 + Vite)

The frontend web client for **ESO Marketplace**, providing live guild trader search, character equipment loadouts, trait research tracking, and public crafting request bounties.

## Environment Configuration

Copy `frontend/.env.example` to `frontend/.env` (or `frontend/.env.local`):

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5001/api` | Base URL for API requests. In production reverse-proxy deployments, set to `/api`. |

> **Note**: Vite only exposes environment variables prefixed with `VITE_` to client-side code via `import.meta.env.VITE_*`.

## Development

```bash
npm install
npm run dev     # Start local Vite dev server at http://localhost:5173
npm run build   # Production bundle build
npm test        # Run Vitest component test suite
npm run lint    # Run Oxlint
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
