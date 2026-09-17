# REST API contract

## Conventions

- Base path: `/api/v1`.
- JSON fields use `camelCase`.
- Vessel identifiers are `IMO1`, `IMO2` and `IMO3`.
- Timestamps use ISO 8601 in UTC, such as `2026-03-01T00:15:00Z`.
- Missing measurements are returned as `null`, never as zero.
- Imported historical observations are read-only.
- Units and supported displays come from variable metadata instead of being duplicated in the client.

## MVP endpoints

### Health

`GET /api/v1/health`

```json
{
  "status": "ok"
}
```

### Vessels

`GET /api/v1/vessels`

```json
{
  "data": [
    {
      "id": "IMO1",
      "name": "IMO1",
      "availableFrom": "2026-03-01T00:15:00Z",
      "availableTo": "2026-08-01T23:45:00Z",
      "gpsObservationCount": 14779,
      "motionObservationCount": 14778
    }
  ]
}
```

The client uses this response for the vessel selector and date limits.

### Variables

`GET /api/v1/variables`

```json
{
  "data": [
    {
      "id": "sogKnots",
      "label": "Speed over ground",
      "unit": "kn",
      "category": "navigation",
      "supportsTrajectoryColour": true,
      "supportsTimeSeries": true
    },
    {
      "id": "rollMotionDeg",
      "label": "Roll motion",
      "unit": "deg",
      "category": "motion",
      "supportsTrajectoryColour": true,
      "supportsTimeSeries": true
    }
  ]
}
```

### Trajectories

`GET /api/v1/trajectories`

| Parameter   | Required | Example                | Rule                                     |
| ----------- | -------- | ---------------------- | ---------------------------------------- |
| `vessels`   | Yes      | `IMO1,IMO2`            | One to three unique vessel IDs           |
| `from`      | Yes      | `2026-03-01T00:15:00Z` | Inclusive UTC timestamp                  |
| `to`        | Yes      | `2026-03-07T23:45:00Z` | Inclusive UTC timestamp after `from`     |
| `colourBy`  | No       | `sogKnots`             | Defaults to `sogKnots`                   |
| `maxPoints` | No       | `5000`                 | Deterministic rendering limit per vessel |

Response content type: `application/geo+json`.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "IMO1:2026-03-01T00:15:00Z:0",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-79.48213196, 32.53641891],
          [-79.47724915, 32.5327301]
        ]
      },
      "properties": {
        "vesselId": "IMO1",
        "segmentIndex": 0,
        "timestamps": ["2026-03-01T00:15:00Z", "2026-03-01T00:30:00Z"],
        "values": [0.58933783, 1.55398405],
        "variable": "sogKnots",
        "unit": "kn",
        "qualityFlags": []
      }
    }
  ],
  "metadata": {
    "from": "2026-03-01T00:15:00Z",
    "to": "2026-03-07T23:45:00Z",
    "colourBy": "sogKnots",
    "gapThresholdMinutes": 30,
    "downsampled": false
  }
}
```

The server returns separate line features when the interval between observations exceeds 30 minutes, coordinates are unavailable, or a trajectory crosses the antimeridian. The `timestamps` and `values` arrays align by index with `geometry.coordinates`. A missing selected-variable value remains `null`.

### Time series

`GET /api/v1/time-series`

| Parameter    | Required | Example                  | Rule                                 |
| ------------ | -------- | ------------------------ | ------------------------------------ |
| `vessels`    | Yes      | `IMO1,IMO2`              | One to three unique vessel IDs       |
| `variables`  | Yes      | `sogKnots,rollMotionDeg` | One to five supported variables      |
| `from`       | Yes      | `2026-03-01T00:15:00Z`   | Inclusive UTC timestamp              |
| `to`         | Yes      | `2026-03-07T23:45:00Z`   | Inclusive UTC timestamp after `from` |
| `resolution` | No       | `auto`                   | `raw`, `1h`, `6h`, `1d` or `auto`    |

```json
{
  "data": [
    {
      "vesselId": "IMO1",
      "variable": "sogKnots",
      "unit": "kn",
      "points": [
        {
          "timestamp": "2026-03-01T00:15:00Z",
          "value": 0.58933783,
          "qualityFlags": []
        }
      ]
    }
  ],
  "metadata": {
    "from": "2026-03-01T00:15:00Z",
    "to": "2026-03-07T23:45:00Z",
    "resolution": "raw",
    "gapThresholdMinutes": 30
  }
}
```

Aggregated points also contain `minimum`, `maximum` and `sampleCount`. Continuous measurements use an arithmetic mean. Course and heading require a circular mean.

### Proposed observation details (not implemented)

`GET /api/v1/vessels/{vesselId}/observations/{timestamp}`

```json
{
  "data": {
    "vesselId": "IMO1",
    "timestamp": "2026-03-01T00:15:00Z",
    "position": {
      "latitude": 32.53641891,
      "longitude": -79.48213196
    },
    "navigation": {
      "courseDeg": 191.69999695,
      "headingDeg": 120.12000275,
      "sogKnots": 0.58933783
    },
    "motion": {
      "rollMotionDeg": 0.33894828,
      "pitchMotionDeg": 0.26198435
    },
    "qualityFlags": []
  }
}
```

A valid GPS observation could have `motion: null`. This endpoint is a possible extension for a selected-point detail panel; the delivered interface obtains its trajectory and telemetry information from the two implemented bounded-window endpoints.

## Replay synchronisation

The client maintains one canonical `replayTimestamp` shared by the map and chart.

- The chart cursor and highlighted map position represent the same instant.
- The client interpolates only between adjacent valid observations for visual movement.
- It never interpolates across a gap longer than 30 minutes.
- Dragging the chart cursor updates the map.
- Changing filters pauses replay and requests a new bounded dataset.
- The API returns a historical window; replay animation runs locally for smoothness.

## Request limits

- At most three vessels per request.
- At most five variables per time-series request.
- Raw time-series requests cover at most 31 days.
- Longer periods use `resolution=auto` or an explicit aggregated resolution.
- `maxPoints` is between 100 and 10,000 per vessel.
- Unknown parameters are rejected so client mistakes remain visible.

## Errors

Errors use `application/problem+json` following RFC 9457 conventions.

```json
{
  "type": "https://fleet-control.example/problems/invalid-date-range",
  "title": "Invalid date range",
  "status": 400,
  "detail": "The 'to' timestamp must be later than the 'from' timestamp.",
  "instance": "/api/v1/trajectories",
  "errors": [
    {
      "field": "to",
      "code": "after_from"
    }
  ]
}
```

- `400`: malformed or inconsistent parameters.
- `404`: unknown vessel or unavailable observation.
- `422`: known parameter with an unsupported value.
- `500`: unexpected server failure.
- `503`: database temporarily unavailable.

## Future HTTP caching strategy

- Vessel and variable metadata can use long-lived caching with validation.
- Historical trajectory and time-series results are cacheable because imports are immutable, although the assessment implementation does not add an HTTP cache layer.
- Cache keys include vessels, timestamps, variables, resolution and `maxPoints`.
- ETags would allow browser revalidation.

## Deferred endpoints

Observation-detail lookup, weather overlays, fuel and RPM estimates, edited scenarios, saved views, authentication and exports do not belong to the first implementation. The advanced-feature proposal describes `/api/v1/scenarios`, but it does not delay the required replay workflow.
