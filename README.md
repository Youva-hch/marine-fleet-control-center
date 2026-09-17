# Marine Fleet Control Center

A full-stack technical assessment for replaying and analysing historical operations from three vessels: IMO1, IMO2 and IMO3.

## What the application does

- Select one or more vessels and a UTC time window.
- Render segmented trajectories on an interactive MapLibre world map.
- Colour every trajectory segment from the selected operational variable.
- Compare up to three telemetry metrics, each with its own unit and scale.
- Inspect exact values and timestamps by hovering the charts.
- Replay the selected period with synchronised chart cursors and vessel positions.
- Aggregate long time windows automatically while preserving raw missing values.
- Remain usable on desktop, tablet and mobile layouts.

## Stack

- React 19, TypeScript and Vite
- MapLibre GL JS
- Fastify REST API
- PostgreSQL 17 with PostGIS
- pnpm workspaces, Vitest, ESLint and Prettier

PostgreSQL is the source of truth. PostGIS stores WGS-84 positions and supports spatial indexing. The current dataset does not require TimescaleDB, but time partitioning or Timescale hypertables are a documented scaling path.

## Run locally

Requirements:

- Node.js 22 or newer
- pnpm 10.30.2
- Docker Desktop or another Docker Compose implementation

```bash
pnpm install
pnpm db:up
pnpm data:import
pnpm dev
```

Place the six supplied CSV files in `data/raw/` before running the import. Their expected names and observed structure are documented in [`data/README.md`](data/README.md).

The web application runs at `http://localhost:5173` and the API at `http://localhost:3000`.

## Quality checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:verify
```

The API integration suite requires the local database to be running and populated. The importer, trajectory segmentation, antimeridian handling, time-series aggregation and HTTP endpoints are covered by automated tests.

## Repository structure

```text
apps/web/              React control-room interface
apps/api/              Fastify API and domain modules
packages/contracts/    Shared TypeScript contracts
scripts/import-data/   Repeatable CSV validation and import
database/migrations/   PostgreSQL/PostGIS schema and vessel seed
docs/                  Architecture, API and product decisions
data/                  Dataset instructions (raw files excluded from Git)
```

## Architecture documentation

- [`docs/architecture.md`](docs/architecture.md): stack, relational model, indexes and query patterns.
- [`docs/api-contract.md`](docs/api-contract.md): REST endpoints, limits and error format.
- [`docs/weather-data-architecture.md`](docs/weather-data-architecture.md): global weather storage and retrieval strategy.
- [`docs/waypoint-editing-proposal.md`](docs/waypoint-editing-proposal.md): advanced draggable-waypoint feature proposal.
- [`docs/assumptions.md`](docs/assumptions.md): ambiguities in the brief and explicit decisions.
- [`docs/data-audit.md`](docs/data-audit.md): supplied-file audit and reconciled observation counts.

## Important implementation decisions

- Imported GPS and motion observations are immutable.
- Missing numeric measurements remain `NULL`; zero is never invented.
- GPS and motion data use separate tables because timestamps and missing rows do not always align.
- Trajectories split across source gaps longer than 30 minutes and antimeridian crossings.
- Long trajectory responses are deterministically downsampled for rendering.
- Long time-series windows use hourly, six-hourly or daily aggregation.
- Replay animation runs locally over a bounded historical response; it does not query the database every animation frame.

## Known boundaries

Historical weather is designed but not integrated into the UI. Waypoint editing is intentionally delivered as the requested technical proposal rather than modifying factual GPS observations. Authentication, saved dashboards and exports are outside this assessment's MVP.

The development map currently uses public OpenStreetMap raster tiles. A production deployment should use an approved hosted or self-hosted tile provider with an appropriate usage agreement.

## Submission date

The brief gives a deadline of **18 September 2026 at 18:00** without specifying a time zone.
