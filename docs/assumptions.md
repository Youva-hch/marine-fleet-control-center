# Assumptions and open questions

This document records ambiguities from the assessment before implementation decisions are made.

## Confirmed ambiguities

- The main brief defines `RPM = 4 x STW`, while the additional information defines `RPM = 4 x SOG`.
- Fuel is priced at EUR 1,000 per tonne in one section and USD 1,000 per tonne in another.
- The weather-factor expression is incomplete and its application is not fully specified.
- The deadline does not include a time zone.
- The submission format is unspecified: repository, archive, deployed application, or a combination.

## Decisions still to make

- Whether the supplied raw CSV files may be committed or should remain local.
- Interpretation of missing STW, RPM and fuel-consumption values.
- Scope of historical weather integration for the first version.
- Deployment target.

## Decisions made

- The application uses React, TypeScript and Vite with MapLibre GL JS and selective D3.js visualisations.
- The backend uses Node.js, TypeScript and a REST API.
- PostgreSQL with PostGIS is the primary database. TimescaleDB is an optional scaling extension.
- Missing numeric measurements remain `NULL`; they are not converted to zero.
- Raw observations remain immutable. Future edited trajectories are stored as separate scenarios.
