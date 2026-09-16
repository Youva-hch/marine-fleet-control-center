import type { Pool } from 'pg';

export interface TrajectoryPoint {
  vesselId: string;
  observedAt: Date;
  longitude: number;
  latitude: number;
  value: number | null;
  qualityFlags: string[];
}

const VARIABLE_SQL: Record<string, string> = {
  courseDeg: 'p.course_deg',
  headingDeg: 'p.heading_deg',
  sogKnots: 'p.sog_knots',
  c1: 'm.c1',
  c2: 'm.c2',
  c3: 'm.c3',
  cTotal: 'm.c_total',
  parametricRollFlag: 'm.parametric_roll_flag',
  pitchAccelerationDegS2: 'm.pitch_acceleration_deg_s2',
  pitchMotionDeg: 'm.pitch_motion_deg',
  pitchPeriodSeconds: 'm.pitch_period_seconds',
  pitchVelocityDegS: 'm.pitch_velocity_deg_s',
  rollAccelerationDegS2: 'm.roll_acceleration_deg_s2',
  rollMotionDeg: 'm.roll_motion_deg',
  rollPeriodSeconds: 'm.roll_period_seconds',
  rollVelocityDegS: 'm.roll_velocity_deg_s',
  xAccelerationMS2: 'm.x_acceleration_m_s2',
  xMotionM: 'm.x_motion_m',
  xVelocityMS: 'm.x_velocity_m_s',
  yAccelerationMS2: 'm.y_acceleration_m_s2',
  yMotionM: 'm.y_motion_m',
  yVelocityMS: 'm.y_velocity_m_s',
  yawAccelerationDegS2: 'm.yaw_acceleration_deg_s2',
  yawMotionDeg: 'm.yaw_motion_deg',
  yawVelocityDegS: 'm.yaw_velocity_deg_s',
  zAccelerationMS2: 'm.z_acceleration_m_s2',
  zMotionM: 'm.z_motion_m',
  zVelocityMS: 'm.z_velocity_m_s',
};

interface DatabaseRow {
  vessel_id: string;
  observed_at: Date;
  longitude: number;
  latitude: number;
  value: number | null;
  quality_flags: string[];
}

export async function fetchTrajectoryPoints(
  database: Pool,
  vesselIds: string[],
  from: Date,
  to: Date,
  variable: string,
): Promise<TrajectoryPoint[]> {
  const valueExpression = VARIABLE_SQL[variable];
  if (!valueExpression)
    throw new Error(`Unsupported trajectory variable: ${variable}`);

  const result = await database.query<DatabaseRow>(
    `SELECT
       v.imo_code AS vessel_id,
       p.observed_at,
       ST_X(p.position::geometry) AS longitude,
       ST_Y(p.position::geometry) AS latitude,
       ${valueExpression} AS value,
       p.quality_flags
     FROM vessel_positions p
     JOIN vessels v ON v.id = p.vessel_id
     LEFT JOIN vessel_motions m
       ON m.vessel_id = p.vessel_id AND m.observed_at = p.observed_at
     WHERE v.imo_code = ANY($1::text[])
       AND p.observed_at >= $2
       AND p.observed_at <= $3
       AND p.position IS NOT NULL
     ORDER BY v.imo_code, p.observed_at`,
    [vesselIds, from, to],
  );

  return result.rows.map((row) => ({
    vesselId: row.vessel_id,
    observedAt: row.observed_at,
    longitude: row.longitude,
    latitude: row.latitude,
    value: row.value,
    qualityFlags: row.quality_flags,
  }));
}
