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
6. Inspect the same variable over time in the timeline.
7. Hover or select a map point to see its timestamp and measurements.
8. Start replay to move through the selected period.
9. Notice visible breaks where source observations are missing.

## Main screen

### Top bar

- Product name and short context.
- Current date range.
- Replay or pause action.

### Filter sidebar

- Multi-select vessels with stable colours.
- Start and end date-time inputs constrained to the available data range.
- Variable selector for trajectory colouring.
- Colour legend with units and minimum and maximum values.
- Short data-quality explanation.

### Map

- Interactive world map as the dominant surface.
- One trajectory per selected vessel.
- Dynamic colour encoding based on the selected variable.
- Zoom, fit-to-selection and pan controls.
- Selection summary with vessel and observation counts.
- Hover detail containing vessel, timestamp, position and selected-variable value.
- Lines split at large temporal gaps and antimeridian crossings.

### Timeline

- One selected variable over the same time window.
- Vessel selector when several vessels are active.
- Shared replay cursor between the chart and map.
- Missing intervals shown as breaks, not interpolated lines.

## Interaction rules

- Apply inexpensive filter changes immediately.
- Debounce date-range changes before requesting trajectory data.
- Keep vessel colours stable across the map, chart and controls.
- Use the selected variable's colour scale for route segments, not for vessel identity.
- Preserve the map position when changing the displayed variable.
- Fit the map only when vessel selection changes or when the user requests it.
- Never connect observations across a gap greater than 30 minutes in the initial version.
- Disable impossible dates rather than return an empty error after submission.

## States to design

- Initial loading.
- No vessel selected.
- Valid selection with data.
- Valid date range with no observations.
- Partial observations or missing variables.
- API or database error with a retry action.
- Replay active, paused and completed.

## Responsive behaviour

- Desktop: filter sidebar, map and timeline visible together.
- Tablet: filters become a compact section above the map.
- Mobile: filters collapse into a drawer; the map remains first and the chart follows below.

The technical assessment is primarily a desktop control-room experience. Mobile support should remain usable, but desktop information density takes priority.

## Accessibility

- Every control has a visible label.
- Vessel and variable meaning never relies on colour alone.
- Keyboard users can select vessels, change filters and control replay.
- Map hover information is also available through focus or a selected-point panel.
- Loading, error and replay states are announced without announcing every animation frame.
- Text and controls maintain readable contrast in both light and dark themes.

## Deferred features

- Editing trajectory waypoints.
- Comparing historical and edited scenarios.
- Downloading data or reports.
- Live weather layers.
- Saved views and user accounts.

These features should not delay the required historical replay and analysis workflow.
