# Architecture decisions

## Application stack

### Front-end

- React with TypeScript and Vite
- MapLibre GL JS for the interactive world map
- D3.js for colour scales and charts where it adds value

Vite keeps the client application simple and fast to build. Server-side rendering is not required for this data-analysis interface. MapLibre supports interactive geographic layers without tying the project to a proprietary map renderer. D3 is used selectively instead of controlling the entire interface.

### Back-end

- Node.js with TypeScript
- REST API

Using TypeScript on both sides reduces context switching and makes shared request and response types possible. REST matches the assessment and is sufficient for vessel, time-window and variable filters. GraphQL would add complexity without a clear need at this scale.

### Database

- PostgreSQL as the source of truth
- PostGIS for vessel positions and spatial queries
- TimescaleDB as an optional extension if time-series partitioning is demonstrated

PostgreSQL is enough for the supplied volume and is easy to explain and operate. PostGIS is directly relevant to trajectories. TimescaleDB is useful as a scaling path, but it is not required to make the first version correct.

### Quality and delivery

- Docker Compose for a reproducible local environment
- Vitest for unit tests
- GitHub Actions for lint, test and build checks

## Data flow

1. Keep the supplied CSV files immutable in a local raw-data directory.
2. Parse and validate timestamps, numeric values and coordinates during import.
3. Normalise source-specific column names into stable application fields.
4. Store GPS and motion observations separately, keyed by vessel and timestamp.
5. Record rejected or incomplete rows instead of silently replacing source values.
6. Query a bounded time window and only the variables requested by the client.

## Initial relational model

### `vessels`

| Column         | Type       | Notes                            |
| -------------- | ---------- | -------------------------------- |
| `id`           | `smallint` | Internal primary key             |
| `imo_code`     | `text`     | Unique value: IMO1, IMO2 or IMO3 |
| `display_name` | `text`     | User-facing name                 |

### `vessel_positions`

| Column          | Type                     | Notes                                  |
| --------------- | ------------------------ | -------------------------------------- |
| `vessel_id`     | `smallint`               | Foreign key to `vessels`               |
| `observed_at`   | `timestamptz`            | Observation time, stored in UTC        |
| `position`      | `geography(Point, 4326)` | Longitude and latitude                 |
| `course_deg`    | `double precision`       | Direction of travel over ground        |
| `heading_deg`   | `double precision`       | Direction of the vessel bow            |
| `sog_knots`     | `double precision`       | Speed over ground                      |
| `quality_flags` | `text[]`                 | Missing or questionable-source markers |

Primary key: (`vessel_id`, `observed_at`).

Indexes:

- B-tree on (`vessel_id`, `observed_at DESC`) for vessel replay queries.
- GiST on `position` for spatial and proximity queries.
- Optional BRIN on `observed_at` when the table becomes much larger.

### `vessel_motions`

| Column                      | Type               | Notes                                            |
| --------------------------- | ------------------ | ------------------------------------------------ |
| `vessel_id`                 | `smallint`         | Foreign key to `vessels`                         |
| `observed_at`               | `timestamptz`      | Observation time, stored in UTC                  |
| `c1`, `c2`, `c3`, `c_total` | `double precision` | Parametric-roll indicators                       |
| `parametric_roll_flag`      | `double precision` | Source indicator                                 |
| `pitch_*`, `roll_*`         | `double precision` | Motion, velocity, acceleration and period values |
| `x_*`, `y_*`, `z_*`         | `double precision` | Linear motion, velocity and acceleration values  |
| `yaw_*`                     | `double precision` | Yaw motion, velocity and acceleration values     |
| `quality_flags`             | `text[]`           | Missing or questionable-source markers           |

Primary key: (`vessel_id`, `observed_at`). The same B-tree time index pattern applies.

### `weather_observations`

| Column            | Type                     | Notes                                        |
| ----------------- | ------------------------ | -------------------------------------------- |
| `id`              | `bigint`                 | Primary key                                  |
| `observed_at`     | `timestamptz`            | Weather observation or model time            |
| `position`        | `geography(Point, 4326)` | Queried location                             |
| `provider`        | `text`                   | Copernicus or another provider               |
| `variable`        | `text`                   | Wave height, current speed, wind speed, etc. |
| `value`           | `double precision`       | Numeric result                               |
| `unit`            | `text`                   | Source unit                                  |
| `source_metadata` | `jsonb`                  | Dataset version, resolution and provenance   |

Weather data should be cached by provider, rounded spatial cell, model time and variable. This avoids downloading or storing an unnecessary global copy while keeping repeated trajectory queries efficient.

### Future trajectory editing

Keep imported observations immutable. A future edit feature should use separate `trajectory_scenarios` and `scenario_waypoints` tables. Moving a waypoint creates or updates a scenario rather than overwriting historical GPS data. The backend validates coordinates and time order, recalculates affected segments and returns a preview to the client.

The complete data model, API workflow, validation rules and front-end interaction are described in [`waypoint-editing-proposal.md`](waypoint-editing-proposal.md).

The global weather caching, interpolation and provider strategy is described in [`weather-data-architecture.md`](weather-data-architecture.md).

## Main query patterns

- Fetch positions for one or more vessels between two timestamps.
- Join motions to positions on (`vessel_id`, `observed_at`) for selected variables.
- Aggregate long time windows into time buckets for charts.
- Retrieve only fields selected by the user.
- Split trajectories at large temporal gaps and at antimeridian crossings before rendering.
