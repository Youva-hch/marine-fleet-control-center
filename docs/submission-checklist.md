# Submission checklist

## Automated verification

- [x] Formatting passes.
- [x] ESLint passes.
- [x] TypeScript compilation passes.
- [x] Production build passes.
- [x] Web replay and telemetry-selection tests pass.
- [x] Import normalisation tests pass.
- [x] API unit and database-backed integration tests pass locally.
- [x] PostgreSQL/PostGIS schema verification passes locally.
- [x] GitHub Actions runs checks that do not require the private CSV files.

## Repository contents

- [x] README contains current setup and feature instructions.
- [x] `.env` and raw datasets are ignored.
- [x] `.env.example` contains development-only values.
- [x] Database schema, indexes and query patterns are documented.
- [x] Global weather storage and retrieval are documented.
- [x] Draggable-waypoint architecture is documented.
- [x] Assumptions and known boundaries are explicit.
- [x] Git working tree is clean.

## Manual checks before sending

- [ ] Create or select the final private repository and configure its Git remote.
- [ ] Push `main` and confirm the CI workflow is green.
- [ ] Decide whether reviewers receive the supplied CSV archive separately; never publish it without permission.
- [ ] Clone the repository into a fresh directory and follow the README from scratch.
- [ ] Verify desktop and mobile layouts in a normal browser.
- [ ] Test one vessel, three vessels, a long date range, three telemetry metrics and replay seeking.
- [ ] Capture one desktop screenshot or a short demo recording if the submission channel supports it.
- [ ] Confirm the recipient, required access permissions and exact delivery channel.
- [ ] Send before 18 September 2026 at 18:00; the brief does not state a time zone, so use Europe/Paris unless clarified.

## Suggested reviewer walkthrough

1. Start with IMO1 over one day and show the colour-coded trajectory.
2. Add IMO2 and IMO3 to demonstrate comparison and stable vessel identities.
3. Select speed, roll and pitch telemetry to show independent units and scales.
4. Hover the charts, seek to a timestamp and start replay.
5. Expand the time window to demonstrate aggregation and trajectory downsampling.
6. Open the architecture documents to explain PostgreSQL/PostGIS, weather caching and immutable scenario editing.
