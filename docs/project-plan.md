# Project structure and implementation plan

## Repository strategy

Use one Git repository with a small workspace structure. The front-end, API and shared contracts remain separate without introducing multiple repositories or deployment pipelines.

Use `pnpm` as the package manager. One lockfile at the repository root keeps dependency versions consistent.

## Target structure

```text
marine-fleet-control-center/
├── .github/
│   └── workflows/
│       └── ci.yml
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── db/
│   │   │   ├── modules/
│   │   │   │   ├── health/
│   │   │   │   ├── observations/
│   │   │   │   ├── time-series/
│   │   │   │   ├── trajectories/
│   │   │   │   ├── variables/
│   │   │   │   └── vessels/
│   │   │   ├── errors/
│   │   │   └── server.ts
│   │   └── tests/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── features/
│       │   │   ├── filters/
│       │   │   ├── map/
│       │   │   ├── replay/
│       │   │   └── time-series/
│       │   ├── lib/
│       │   ├── styles/
│       │   └── main.tsx
│       └── tests/
├── packages/
│   └── contracts/
│       └── src/
├── database/
│   ├── migrations/
│   └── seeds/
├── scripts/
│   └── import-data/
├── data/
│   ├── README.md
│   └── raw/
├── docs/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Only directories needed by an implemented feature should be created. Empty placeholder trees add noise and should not be committed.

## Responsibilities

### `apps/web`

Owns the React interface, MapLibre map, SVG visual encodings, filters, timeline and replay state. It does not contain SQL, CSV parsing or business rules for data validity.

Organise by user-facing feature rather than by technical file type. Components used only by the map belong in `features/map`, not in a global component directory.

### `apps/api`

Owns HTTP validation, database queries, GeoJSON generation, time-series aggregation and standard errors.

Organise routes, services, queries and tests by domain module. Avoid large global `controllers`, `services` and `repositories` folders that separate closely related code.

### `packages/contracts`

Owns shared TypeScript schemas and types for API inputs and responses. Runtime validation schemas should generate or infer TypeScript types so static definitions cannot drift from actual validation.

This package must not depend on React, the HTTP server or the database.

### `database`

Owns versioned SQL migrations and minimal reference seeds such as the three vessel records. Historical CSV observations are imported separately and are not embedded in migrations.

### `scripts/import-data`

Owns the repeatable CSV import and validation process. It maps inconsistent source headers, preserves missing values, records quality flags and prints an import summary.

### `data/raw`

Contains the six local CSV files. It stays outside Git. `data/README.md` explains how to place the files locally.

## Dependency direction

```text
apps/web ────────┐
                 ├──> packages/contracts
apps/api ────────┘
     │
     ├──> PostgreSQL / PostGIS
     └──> database migrations

scripts/import-data ──> PostgreSQL / PostGIS
data/raw ─────────────> scripts/import-data
```

The shared contracts package has no dependency on either application. The web application never imports API implementation code.

## Environment variables

The future `.env.example` should contain names and safe local defaults only:

```text
DATABASE_URL=
API_PORT=
WEB_PORT=
VITE_API_BASE_URL=
```

MapLibre does not require a proprietary access token when used with a compatible public or self-hosted style. Any selected map-style provider must be documented before adding a key.

## Implementation order

### Commit 1: Workspace foundation

```text
chore: scaffold TypeScript workspace
```

- Root `pnpm` workspace.
- React/Vite application.
- Node/TypeScript API.
- Shared contracts package.
- Formatting, linting and base test commands.
- No feature implementation.

### Commit 2: Local database

```text
feat(database): add vessel observation schema
```

- Docker Compose with PostgreSQL and PostGIS.
- Tables, constraints and indexes from the architecture document.
- Vessel reference seed.
- Migration verification.

### Commit 3: Data import

```text
feat(data): import and validate vessel CSV files
```

- Header normalisation.
- UTC timestamp assumption.
- Missing-value preservation.
- Course normalisation.
- Import summary and repeatability test.

### Commit 4: Metadata API

```text
feat(api): expose vessel and variable metadata
```

- Health, vessels and variables routes.
- Runtime request and response schemas.
- API error format.

### Commit 5: Trajectory API

```text
feat(api): serve segmented GeoJSON trajectories
```

- Date and vessel filters.
- Gap segmentation.
- Antimeridian handling.
- Selected-variable values.
- API tests using known data slices.

### Commit 6: Time-series API

```text
feat(api): expose vessel time series
```

- Raw and aggregated resolutions.
- Missing data and gaps.
- Circular mean for directional values.

### Commit 7: Application shell

```text
feat(web): build fleet control workspace
```

- macOS-inspired visual system.
- Responsive application frame.
- Vessel, date and variable controls.
- Loading, empty and error states.

### Commit 8: Interactive map

```text
feat(web): render colour-coded vessel trajectories
```

- MapLibre map.
- Stable vessel identity.
- Variable colour scale.
- Fit selection and observation detail.

### Commit 9: Timeline and replay

```text
feat(web): synchronise timeline and voyage replay
```

- SVG time-series chart.
- Shared replay timestamp.
- Play, pause, seek and completion states.
- No interpolation across missing intervals.

### Commit 10: Delivery quality

```text
chore: add CI and submission documentation
```

- GitHub Actions.
- Key unit and integration tests.
- Final README and architecture diagrams.
- Screenshots and demonstration instructions.
- Documented assumptions and known limitations.

## MVP boundary

The submission is viable when a reviewer can select vessels and dates, colour their trajectories by an available variable, inspect the matching timeline and run the historical replay.

The following must not delay that result:

- live weather layers;
- real trajectory editing;
- authentication;
- saved dashboards;
- report exports;
- deployment optimisations for fleet-scale production volume.

## Review gates

Before moving to the next phase:

1. Workspace: every package starts and all root commands are documented.
2. Database: constraints and indexes match the proposed query patterns.
3. Import: row totals reconcile with the audit document.
4. API: example requests match `docs/api-contract.md`.
5. Map: temporal gaps and antimeridian crossings render correctly.
6. Replay: map and chart always share the same timestamp.
7. Submission: the candidate can explain every dependency and architectural choice.
