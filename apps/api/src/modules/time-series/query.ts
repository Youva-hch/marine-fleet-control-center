import type { Pool } from 'pg';

import type { RawSeriesPoint } from './aggregation.js';

const VARIABLE_SOURCE: Record<
  string,
  { table: 'vessel_positions' | 'vessel_motions'; column: string }
> = {
  courseDeg: { table: 'vessel_positions', column: 'course_deg' },
  headingDeg: { table: 'vessel_positions', column: 'heading_deg' },
  sogKnots: { table: 'vessel_positions', column: 'sog_knots' },
  c1: { table: 'vessel_motions', column: 'c1' },
  c2: { table: 'vessel_motions', column: 'c2' },
  c3: { table: 'vessel_motions', column: 'c3' },
  cTotal: { table: 'vessel_motions', column: 'c_total' },
  parametricRollFlag: {
    table: 'vessel_motions',
    column: 'parametric_roll_flag',
  },
  pitchAccelerationDegS2: {
    table: 'vessel_motions',
    column: 'pitch_acceleration_deg_s2',
  },
  pitchMotionDeg: { table: 'vessel_motions', column: 'pitch_motion_deg' },
  pitchPeriodSeconds: {
    table: 'vessel_motions',
    column: 'pitch_period_seconds',
  },
  pitchVelocityDegS: {
    table: 'vessel_motions',
    column: 'pitch_velocity_deg_s',
  },
  rollAccelerationDegS2: {
    table: 'vessel_motions',
    column: 'roll_acceleration_deg_s2',
  },
  rollMotionDeg: { table: 'vessel_motions', column: 'roll_motion_deg' },
  rollPeriodSeconds: { table: 'vessel_motions', column: 'roll_period_seconds' },
  rollVelocityDegS: { table: 'vessel_motions', column: 'roll_velocity_deg_s' },
  xAccelerationMS2: { table: 'vessel_motions', column: 'x_acceleration_m_s2' },
  xMotionM: { table: 'vessel_motions', column: 'x_motion_m' },
  xVelocityMS: { table: 'vessel_motions', column: 'x_velocity_m_s' },
  yAccelerationMS2: { table: 'vessel_motions', column: 'y_acceleration_m_s2' },
  yMotionM: { table: 'vessel_motions', column: 'y_motion_m' },
  yVelocityMS: { table: 'vessel_motions', column: 'y_velocity_m_s' },
  yawAccelerationDegS2: {
    table: 'vessel_motions',
    column: 'yaw_acceleration_deg_s2',
  },
  yawMotionDeg: { table: 'vessel_motions', column: 'yaw_motion_deg' },
  yawVelocityDegS: { table: 'vessel_motions', column: 'yaw_velocity_deg_s' },
  zAccelerationMS2: { table: 'vessel_motions', column: 'z_acceleration_m_s2' },
  zMotionM: { table: 'vessel_motions', column: 'z_motion_m' },
  zVelocityMS: { table: 'vessel_motions', column: 'z_velocity_m_s' },
};

interface Row {
  observed_at: Date;
  value: number | null;
  quality_flags: string[];
}

export async function fetchSeries(
  database: Pool,
  vesselId: string,
  variable: string,
  from: Date,
  to: Date,
): Promise<RawSeriesPoint[]> {
  const source = VARIABLE_SOURCE[variable];
  if (!source) throw new Error(`Unsupported time-series variable: ${variable}`);
  const result = await database.query<Row>(
    `SELECT o.observed_at, o.${source.column} AS value, o.quality_flags
     FROM ${source.table} o
     JOIN vessels v ON v.id = o.vessel_id
     WHERE v.imo_code = $1 AND o.observed_at >= $2 AND o.observed_at <= $3
     ORDER BY o.observed_at`,
    [vesselId, from, to],
  );
  return result.rows.map((row) => ({
    timestamp: row.observed_at,
    value: row.value,
    qualityFlags: row.quality_flags,
  }));
}
