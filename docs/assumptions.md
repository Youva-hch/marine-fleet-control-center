# Assumptions and open questions

This document records ambiguities from the assessment before implementation decisions are made.

## Confirmed ambiguities

- The main brief defines `RPM = 4 x STW`, while the additional information defines `RPM = 4 x SOG`.
- Fuel is priced at EUR 1,000 per tonne in one section and USD 1,000 per tonne in another.
- The weather-factor expression is incomplete and its application is not fully specified.
- The deadline does not include a time zone.
- The submission format is unspecified: repository, archive, deployed application, or a combination.

## Decisions still to make

- Deployment target and production map-tile provider.
- Whether a later phase should implement the documented weather-provider adapters.

## Decisions made

- The application uses React, TypeScript and Vite with MapLibre GL JS and selective D3.js visualisations.
- The backend uses Node.js, TypeScript and a REST API.
- PostgreSQL with PostGIS is the primary database. TimescaleDB is an optional scaling extension.
- Missing numeric measurements remain `NULL`; they are not converted to zero.
- Raw observations remain immutable. Future edited trajectories are stored as separate scenarios.
- The supplied CSV files remain local under `data/raw/` and are excluded from Git.
- RPM and fuel are not invented from SOG because the brief is inconsistent about STW versus SOG; they can be added later as explicitly labelled estimates.
- Historical weather storage and retrieval are delivered as an architecture proposal rather than a live integration.
