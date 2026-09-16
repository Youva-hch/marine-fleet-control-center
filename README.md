# Marine Fleet Control Center

Technical assessment project for replaying and analysing the historical operations of three vessels (IMO1, IMO2 and IMO3).

## Status

The architecture and API contract are documented. The repository now contains the initial web, API and shared-contract workspaces; product features and data ingestion have not started yet.

## Expected scope

- Select one or more vessels.
- Filter observations by a start and end date.
- Visualise one or more time-series variables.
- Display vessel trajectories on an interactive world map.
- Colour trajectories dynamically using a selected variable.
- Document a scalable time-series database architecture.
- Propose an interactive trajectory-editing feature.

## Repository structure

- `apps/web/`: React and Vite frontend.
- `apps/api/`: Fastify API.
- `packages/contracts/`: shared API contracts.
- `docs/`: requirements, assumptions and future architecture decisions.
- `data/`: documentation about the supplied datasets.
- `data/raw/`: local source datasets, intentionally excluded from Git.

## Selected stack

- React, TypeScript and Vite
- MapLibre GL JS and D3.js
- Node.js with a REST API
- PostgreSQL with PostGIS; TimescaleDB remains an optional extension
- Docker Compose, Vitest and GitHub Actions

The API request and response formats are defined in `docs/api-contract.md` before implementation.

The intended repository structure and commit sequence are defined in `docs/project-plan.md`.

## Local development

Requirements: Node.js 22 or newer and pnpm 10.30.2.

```bash
pnpm install
pnpm db:up
pnpm dev
```

The web application runs on `http://localhost:5173` and the API on `http://localhost:3000` by default.

Quality checks:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:verify
```

## Data

The source archive is kept outside this repository. See `data/README.md` before importing it locally.

## Important date

Submission deadline: 18 September 2026 at 18:00. The source document does not specify a time zone.
