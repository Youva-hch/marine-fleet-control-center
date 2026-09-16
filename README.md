# Marine Fleet Control Center

Technical assessment project for replaying and analysing the historical operations of three vessels (IMO1, IMO2 and IMO3).

## Status

Data audit and architecture phase. The technical stack and initial database model have been selected. No application code has been written yet.

## Expected scope

- Select one or more vessels.
- Filter observations by a start and end date.
- Visualise one or more time-series variables.
- Display vessel trajectories on an interactive world map.
- Colour trajectories dynamically using a selected variable.
- Document a scalable time-series database architecture.
- Propose an interactive trajectory-editing feature.

## Repository structure

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

## Data

The source archive is kept outside this repository. See `data/README.md` before importing it locally.

## Important date

Submission deadline: 18 September 2026 at 18:00. The source document does not specify a time zone.
