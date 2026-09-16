export type CsvRecord = Record<string, string>;

export interface PositionRow {
  observedAt: Date;
  longitude: number | null;
  latitude: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
  sogKnots: number | null;
  qualityFlags: string[];
}

const GPS_HEADERS = {
  course: ['Course [deg] (NAVIGATION_GPS)', 'Course [deg] (NAVIGATION)'],
  heading: ['Heading [deg] (NAVIGATION_GYRO)', 'Heading [deg] (NAVIGATION)'],
  latitude: ['Latitude [deg] (NAVIGATION_GPS)', 'Latitude [deg] (NAVIGATION)'],
  longitude: [
    'Longitude [deg] (NAVIGATION_GPS)',
    'Longitude [deg] (NAVIGATION)',
  ],
  speed: ['Speed [kn] (NAVIGATION_GPS)', 'Speed [kn] (NAVIGATION)'],
} as const;

function valueFor(record: CsvRecord, candidates: readonly string[]): string {
  for (const candidate of candidates) {
    if (candidate in record) return record[candidate] ?? '';
  }
  throw new Error(`Missing expected CSV column: ${candidates.join(' or ')}`);
}

export function parseUtcTimestamp(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid timestamp: ${value || '<empty>'}`);
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid timestamp: ${value}`);
  return date;
}

export function parseOptionalNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new Error(`Invalid numeric value: ${value}`);
  return parsed;
}

export function normalisePosition(record: CsvRecord): PositionRow {
  const flags: string[] = [];
  let course = parseOptionalNumber(valueFor(record, GPS_HEADERS.course));
  let heading = parseOptionalNumber(valueFor(record, GPS_HEADERS.heading));
  let latitude = parseOptionalNumber(valueFor(record, GPS_HEADERS.latitude));
  let longitude = parseOptionalNumber(valueFor(record, GPS_HEADERS.longitude));
  let speed = parseOptionalNumber(valueFor(record, GPS_HEADERS.speed));

  if (course === 360) {
    course = 0;
    flags.push('course_normalised_360');
  } else if (course !== null && (course < 0 || course >= 360)) {
    course = null;
    flags.push('invalid_course');
  } else if (course === null) flags.push('missing_course');

  if (heading !== null && (heading < 0 || heading > 360)) {
    heading = null;
    flags.push('invalid_heading');
  } else if (heading === null) flags.push('missing_heading');

  const hasValidPosition =
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
  if (!hasValidPosition) {
    flags.push(
      latitude === null && longitude === null
        ? 'missing_position'
        : 'invalid_position',
    );
    latitude = null;
    longitude = null;
  }

  if (speed !== null && speed < 0) {
    speed = null;
    flags.push('invalid_sog');
  } else if (speed === null) flags.push('missing_sog');

  return {
    observedAt: parseUtcTimestamp(record.Timestamp ?? ''),
    longitude,
    latitude,
    courseDeg: course,
    headingDeg: heading,
    sogKnots: speed,
    qualityFlags: flags,
  };
}

export const MOTION_COLUMNS = [
  ['C1 [-] (Parametric Roll Advanced 2 to 1)', 'c1'],
  ['C2 [-] (Parametric Roll Advanced 2 to 1)', 'c2'],
  ['C3 [-] (Parametric Roll Advanced 2 to 1)', 'c3'],
  ['CTotal [-] (Parametric Roll Advanced 2 to 1)', 'c_total'],
  [
    'Parametric Roll Advanced 2 to 1 [-] (Parametric Roll Advanced 2 to 1)',
    'parametric_roll_flag',
  ],
  ['Pitch acceleration [deg/s2] (Motion Sensor)', 'pitch_acceleration_deg_s2'],
  ['Pitch motion [deg] (Motion Sensor)', 'pitch_motion_deg'],
  ['Pitch motion - period [sec] (Motion Sensor)', 'pitch_period_seconds'],
  ['Pitch velocity [deg/s] (Motion Sensor)', 'pitch_velocity_deg_s'],
  ['Roll acceleration [deg/s2] (Motion Sensor)', 'roll_acceleration_deg_s2'],
  ['Roll motion [deg] (Motion Sensor)', 'roll_motion_deg'],
  ['Roll motion - period [sec] (Motion Sensor)', 'roll_period_seconds'],
  ['Roll velocity [deg/s] (Motion Sensor)', 'roll_velocity_deg_s'],
  ['X acceleration [m/s2] (Motion Sensor)', 'x_acceleration_m_s2'],
  ['X motion [m] (Motion Sensor)', 'x_motion_m'],
  ['X velocity [m/s] (Motion Sensor)', 'x_velocity_m_s'],
  ['Y acceleration [m/s2] (Motion Sensor)', 'y_acceleration_m_s2'],
  ['Y motion [m] (Motion Sensor)', 'y_motion_m'],
  ['Y velocity [m/s] (Motion Sensor)', 'y_velocity_m_s'],
  ['Yaw acceleration [deg/s2] (Motion Sensor)', 'yaw_acceleration_deg_s2'],
  ['Yaw motion [deg] (Motion Sensor)', 'yaw_motion_deg'],
  ['Yaw velocity [deg/s] (Motion Sensor)', 'yaw_velocity_deg_s'],
  ['Z acceleration [m/s2] (Motion Sensor)', 'z_acceleration_m_s2'],
  ['Z motion [m] (Motion Sensor)', 'z_motion_m'],
  ['Z velocity [m/s] (Motion Sensor)', 'z_velocity_m_s'],
] as const;

export function normaliseMotion(record: CsvRecord) {
  const flags: string[] = [];
  const values = MOTION_COLUMNS.map(([source, target]) => {
    const value = parseOptionalNumber(valueFor(record, [source]));
    if (value === null) flags.push(`missing_${target}`);
    return value;
  });
  return {
    observedAt: parseUtcTimestamp(record.Timestamp ?? ''),
    values,
    qualityFlags: flags,
  };
}
