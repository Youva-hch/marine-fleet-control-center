# Global weather data architecture

## Goal

For any vessel position and timestamp, return environmental conditions such as wind, waves and ocean currents without copying every global source dataset into the transactional database.

## Recommended storage model

Use two storage tiers:

1. Keep provider files such as GRIB or NetCDF objects in object storage when bulk data is downloaded. Partition object keys by provider, dataset version, variable and model date.
2. Keep a query-oriented cache in PostgreSQL/PostGIS for values actually requested along vessel routes.

The relational cache uses `weather_observations`:

| Column                           | Purpose                                                |
| -------------------------------- | ------------------------------------------------------ |
| `provider`                       | Copernicus Marine, CDS or another source               |
| `dataset_id` / `dataset_version` | Reproducibility and invalidation                       |
| `variable`                       | Wave height, current components, wind components, etc. |
| `valid_at`                       | UTC model or observation time                          |
| `grid_cell`                      | Provider grid identifier or rounded spatial key        |
| `position`                       | PostGIS point for spatial queries                      |
| `depth_m`                        | Nullable depth for ocean variables                     |
| `value` / `unit`                 | Normalised numeric result and unit                     |
| `source_metadata`                | Run time, interpolation method and provenance          |

A unique constraint on `(provider, dataset_version, variable, valid_at, grid_cell, depth_m)` makes ingestion idempotent. A B-tree index on `(variable, valid_at)` and a GiST index on `position` support the main lookup patterns. Large caches can be partitioned by month or converted to a TimescaleDB hypertable.

## Retrieval flow

1. The client requests weather for a bounded trajectory and a list of variables.
2. The API reduces positions to provider grid cells and required model time steps.
3. It checks the relational cache in one batched query rather than issuing one query per point.
4. Cache misses are grouped and sent to the provider adapter.
5. Returned values and provenance are stored idempotently.
6. The service performs temporal interpolation between model steps and, when appropriate, bilinear spatial interpolation between surrounding cells.
7. The API aligns the resulting values with vessel timestamps and returns quality flags when interpolation or source data is unavailable.

The cache key must include provider, dataset version, variable, grid cell, time, depth and interpolation policy. Dataset-version changes therefore cannot silently reuse stale values.

## Route prefetching

Interactive requests should not wait for thousands of remote API calls. When a user selects a long voyage, a background job can prefetch cells intersecting a buffered route corridor. The UI first receives cached coverage and a coverage status, then refreshes when missing cells arrive.

For frequently analysed voyages, materialised route-weather samples may be stored with `(vessel_id, observed_at, weather_observation_id, interpolation_metadata)`. They are derived data and can be rebuilt when a provider dataset changes.

## Reliability and governance

- Provider adapters expose the same internal units and error model.
- Rate limits use bounded concurrency, exponential backoff and circuit breaking.
- Provider timeouts return partial data with explicit quality flags rather than fabricated zeroes.
- Raw-file checksums, dataset licences and attribution are retained.
- Cache retention is based on reproducibility needs; immutable historical model runs can be kept, while superseded derived samples can be rebuilt.
- Metrics track cache hit rate, provider latency, missing coverage and dataset version.

## Why not store the complete globe in PostgreSQL?

Global multidimensional models can be very large and are naturally distributed as chunked scientific files. Object storage is cheaper and preserves the provider format. PostgreSQL/PostGIS remains valuable as the indexed hot cache and provenance catalogue for the small spatial-temporal subset intersecting fleet routes.
