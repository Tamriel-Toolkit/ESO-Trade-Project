# Contributing

Contributions from outside the organization are welcome. Fork the repository and open a PR; organization membership is not required.

## Local setup

Every clone or worktree needs its own dependency installation. Run `npm ci` in `backend` and `frontend`, copy each `.env.example` to `.env`, then start the backend with `npm start` and frontend with `npm run dev`.

## Pull requests

1. Describe the problem, approach and relevant validation. Link an issue when one exists; a small maintenance PR does not need an artificial issue.
2. Keep production listings authentic and preserve the data boundaries below.
3. Run tests appropriate to the change. CI runs the application suites plus Windows/Linux automation regressions. Until #163 is resolved, avoid running the password suite against a configured application database; CI explicitly uses `DB_PATH=:memory:` for that suite's server import.
4. A maintainer can comment `/review` or dispatch **Agentic PR Review** from `main` for any author's PR. Review labels report advisory results, not approval. Address substantive findings; record why a suggestion does not apply when appropriate.
5. Merge through a PR after **CI Status Gate** passes and conversations are resolved. Use squash merge. Direct pushes, force pushes and branch-protection bypass are not part of normal work.

The primary maintainer's roadmap work follows #35. External contributions and urgent maintenance are not prohibited by the roadmap's single-active-item convention.

## Data boundaries

- UESP supplies static item identity, taxonomy, set metadata and source icon paths.
- Live guild listings come from native ESOTrade SavedVariables. Do not generate synthetic listings in production; isolated test fixtures are allowed.
- Active matching listings remain discoverable after commit; absence from a scan is not deletion evidence.
- Native Id64 values remain validated decimal strings throughout the pipeline.
- Catalog updates preserve user accounts, characters, builds, requests, watchlists and observations.
- Browsers use the backend icon cache. Lua addons use official ESO APIs without networking or process/memory inspection.

See [GitHub governance and automation](docs/GITHUB_WORKFLOW.md) for roles, review states, failure recovery and bot configuration.
