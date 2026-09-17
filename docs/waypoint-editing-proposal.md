# Interactive waypoint editing proposal

## Product behaviour

A fleet manager creates an alternative voyage scenario from a historical trajectory, drags one or more editable waypoints and immediately sees a preview of the revised route and its estimated impact. Historical GPS observations remain visible and are never overwritten.

## Data model

### `trajectory_scenarios`

- `id` UUID primary key
- `vessel_id` foreign key
- `name`, `status` (`draft`, `published`, `archived`)
- `source_from`, `source_to`
- `version` integer for optimistic concurrency
- `created_by`, `created_at`, `updated_at`

### `scenario_waypoints`

- `id` UUID primary key
- `scenario_id` foreign key with cascading deletion
- `sequence` integer with a unique constraint per scenario
- `position geography(Point, 4326)`
- `planned_at timestamptz`
- `source_observation_at timestamptz` nullable reference to the original sample
- `kind` (`fixed`, `editable`, `generated`)
- `constraints jsonb` for speed, arrival window or safety metadata

### `scenario_segments`

- start and end waypoint IDs
- generated geometry as `geography(LineString, 4326)`
- distance, duration and estimated fuel
- routing-engine version, weather-dataset version and calculation status

Scenario tables hold user intent and derived previews. They do not mutate `vessel_positions`.

## API workflow

1. `POST /api/v1/scenarios` creates a draft from a vessel and historical window.
2. `GET /api/v1/scenarios/{id}` returns original geometry, editable waypoints, derived segments and the current version.
3. `PATCH /api/v1/scenarios/{id}/waypoints/{waypointId}` accepts coordinates, planned time and `expectedVersion`.
4. The backend validates the edit and returns a quick preview plus a new scenario version.
5. A background calculation can replace the preview with a weather-aware routed segment.
6. `POST /api/v1/scenarios/{id}/publish` freezes a reviewed version; a later edit creates a new draft version.

The PATCH endpoint is idempotent for a client-generated operation ID. A version mismatch returns `409 Conflict`, preventing two browser sessions from silently overwriting each other.

## Backend validation and calculation

- Reject coordinates outside valid WGS-84 bounds.
- Preserve waypoint sequence and strictly increasing planned times.
- Protect fixed departure and arrival points unless explicitly unlocked.
- Reject land crossings and restricted areas using PostGIS intersection checks or a routing service.
- Enforce configurable speed and turn-rate limits.
- Recalculate only the two segments adjacent to the moved waypoint.
- Use a geodesic line for the immediate preview, then replace it with the routing-engine result.
- Recompute distance, ETA, weather exposure and fuel estimates with recorded model versions.

All edits create audit events containing actor, previous value, new value, time and calculation version.

## Front-end interaction

MapLibre renders the historical route as a muted immutable layer and the scenario as a separate highlighted source. Editable waypoints use draggable markers with keyboard-accessible alternatives.

During a drag:

1. Update adjacent line segments locally for immediate feedback.
2. Display coordinates, estimated distance change and a `preview` state.
3. Debounce PATCH requests so pointer movement does not flood the API.
4. Replace the local line with the authoritative backend preview.
5. Show validation failures beside the waypoint and restore the last valid position when required.

Undo and redo operate on scenario operations, not GPS rows. A comparison control toggles original, proposed and difference views. Publishing requires explicit confirmation because it changes a planning scenario used by other users.

## Scaling and failure handling

- Recalculate only affected segments and cache results by endpoints, vessel model, constraints and weather version.
- Send slow routing work to a job queue and stream or poll calculation status.
- Keep the last valid preview visible if the routing service is unavailable.
- Store versioned results so calculations remain explainable after routing or weather models change.
- Authorise edits separately from read-only fleet monitoring.

This design provides an interactive editing experience while preserving the integrity and auditability of historical vessel data.
