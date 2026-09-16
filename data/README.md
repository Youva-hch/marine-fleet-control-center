# Supplied datasets

The source ZIP contains six relevant CSV files:

- `IMO1_GPS.csv`
- `IMO2_GPS.csv`
- `IMO3_GPS.csv`
- `IMO1_MOTIONS.csv`
- `IMO2_MOTIONS.csv`
- `IMO3_MOTIONS.csv`

It also contains macOS metadata under `__MACOSX/`; those files are not project data and must be ignored.

## Observed structure

GPS files contain timestamps, course, heading, latitude, longitude and speed in knots. Motion files contain timestamps and several motion, velocity and acceleration measurements. Sampling is approximately every 15 minutes.

The observed period is 1 March 2026 at 00:15 through 1 August 2026 at 23:45. This is about five months, despite the assessment describing a ten-month dataset.

## Repository policy

Raw data belongs in `data/raw/` for local analysis. That directory is excluded from Git until data-sharing and repository-size decisions have been made explicitly.

The initial audit read directly from the supplied ZIP. The raw CSV files have not been copied into the repository.
