# Data audit

## Scope

The supplied ZIP contains six relevant CSV files: one GPS file and one motion file for each of IMO1, IMO2 and IMO3. macOS metadata under `__MACOSX/` is not source data.

All six files use a nominal 15-minute sampling interval and cover 1 March 2026 at 00:15 through 1 August 2026 at 23:45. A complete 15-minute series over that interval contains 14,784 timestamps.

## Summary

| Vessel | GPS rows | Motion rows | GPS timestamps missing from complete series | Motion timestamps missing from complete series | GPS-to-motion timestamp coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| IMO1 | 14,779 | 14,778 | 5 | 6 | 99.9932% |
| IMO2 | 14,436 | 14,436 | 348 | 348 | 100% |
| IMO3 | 14,235 | 13,546 | 549 | 1,238 | 95.1598% |

No file contains duplicate rows, duplicate timestamps or invalid timestamp strings.

## Missing values

### IMO1

- GPS: two rows have missing course, latitude, longitude and speed values, for eight missing cells in total.
- Motions: 16 rows each lack the 20 motion-sensor fields, for 320 missing cells.
- One GPS timestamp has no corresponding motion observation.

### IMO2

- GPS: no missing values.
- Motions: six rows each lack the 20 motion-sensor fields, for 120 missing cells.
- GPS and motion timestamps align exactly.

### IMO3

- GPS: three missing heading values.
- Motions: twelve rows lack the 20 motion-sensor fields. One additional row lacks the five parametric-roll fields, for 245 missing cells in total.
- 689 GPS timestamps have no corresponding motion observation.

Missing numeric source values must remain `NULL`. They must not be converted to zero because zero is a valid measurement for several variables.

## Temporal gaps

Small 30- or 45-minute gaps occur in all three vessels. Two vessels also contain long outages:

- IMO2 has gaps of 4,035 minutes and 1,050 minutes.
- IMO3 GPS has a gap of 8,070 minutes.
- IMO3 motions additionally have gaps of 1,620, 5,745, 2,640 and 390 minutes.

The API should not interpolate across these outages by default. The client must split displayed trajectory and chart segments when the interval exceeds an agreed threshold, initially 30 minutes.

## GPS validity

- All available latitude and longitude values fall within geographic bounds.
- No negative speeds occur.
- Maximum observed speeds range from 18.97 to 22.39 knots and are plausible for this exercise.
- IMO2 contains two course values equal to 360 degrees. These are directionally equivalent to 0 degrees and can be normalised during import while preserving the raw value if required.
- IMO1 and IMO3 each cross the antimeridian twice. A continuous line drawn without splitting or longitude unwrapping would incorrectly span the whole world map.

## Column normalisation

The three GPS files use slightly different source labels. IMO2 uses `(NAVIGATION)` while IMO1 and IMO3 use `(NAVIGATION_GPS)` and `(NAVIGATION_GYRO)`. Import code must map by semantic field rather than require identical source headers.

Application field names should be stable and unit-aware, for example `course_deg`, `heading_deg`, `latitude_deg`, `longitude_deg` and `sog_knots`.

## Import policy

1. Preserve source CSV files unchanged.
2. Parse timestamps explicitly and document the assumed source time zone.
3. Reject only rows without a usable vessel identifier or timestamp.
4. Store incomplete observations with `NULL` fields and quality flags.
5. Normalise a course of 360 degrees to 0 degrees for calculations.
6. Validate geographic ranges and non-negative speed.
7. Report temporal gaps; do not silently synthesize observations.
8. Keep GPS and motion records separate so missing motion data does not remove a valid position.

## Open questions

- The CSV timestamps have no explicit time-zone information. UTC is a reasonable working assumption, but it must be documented.
- The assessment calls the data ten months long, while the files contain approximately five months.
- STW is absent. It cannot be reconstructed from SOG without current vectors from an external weather or ocean dataset.
