# UX specification

## Product goal

Help a fleet-control manager select vessels, choose a historical time window and understand where each vessel travelled and how its operating variables changed.

The first version uses one primary workspace instead of separate dashboard pages. The map remains the main visual. Filters stay visible, and the timeline provides the detailed temporal view.

## Primary user journey

1. Open the application and see the available period and three vessels.
2. Select one or more vessels.
3. Choose a start and end date.
4. Choose the variable used to colour the trajectories.
5. Compare trajectories on the world map.
6. Select up to three variables and compare them over time in the timeline.
7. Hover the timeline to see exact timestamps and measurements.
8. Start replay to move through the selected period.
9. Notice visible breaks where source observations are missing.

## Main screen

### Top bar

- Product name and short context.
- Current date range.
- Replay or pause action.

### Filter sidebar

- Multi-select vessels with stable colours.
- Start and end date-time inputs in UTC.
- Variable selector for trajectory colouring.
- Telemetry multi-selector for up to three simultaneous metrics.

### Map

- Interactive world map as the dominant surface.
- One trajectory per selected vessel.
- Dynamic colour encoding based on the selected variable.
- Zoom, fit-to-selection and pan controls.
- Selection summary with vessel and observation counts.
- Lines split at large temporal gaps and antimeridian crossings.

### Timeline

- Up to three selected variables over the same time window.
- One stable visual identity per active vessel.
- Shared replay cursor between the chart and map.
- Hover tooltips with timestamp and per-vessel values.
- Missing intervals shown as breaks, not interpolated lines.

## Interaction rules

- Apply inexpensive filter changes immediately.
- Keep vessel colours stable across the map, chart and controls.
- Use the selected variable's colour scale for route segments, not for vessel identity.
- Never connect observations across a gap greater than 30 minutes in the initial version.
- Pause and reset replay when a filter changes.

## States to design

- Initial loading.
- No vessel selected.
- Valid selection with data.
- Valid date range with no observations.
- Partial observations or missing variables.
- API or database error with a visible message.
- Replay active, paused and completed.

## Responsive behaviour

- Desktop: filter sidebar, map and timeline visible together.
- Tablet: the side panel and telemetry compact while keeping the map visible.
- Mobile: filters, map and telemetry form a vertical stack without fixed-height overlap.

The technical assessment is primarily a desktop control-room experience. Mobile support should remain usable, but desktop information density takes priority.

## Accessibility

- Every control has a visible label.
- Vessel and variable meaning never relies on colour alone.
- Keyboard users can select vessels, change filters and control replay.
- The replay range control is keyboard accessible.
- Text and controls maintain readable contrast in the delivered dark theme.

## Deferred features

- Editing trajectory waypoints.
- Comparing historical and edited scenarios.
- Downloading data or reports.
- Live weather layers.
- Saved views and user accounts.

These features should not delay the required historical replay and analysis workflow.
