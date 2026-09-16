BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE vessels (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  imo_code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  CONSTRAINT vessels_imo_code_format CHECK (imo_code ~ '^IMO[0-9]+$'),
  CONSTRAINT vessels_display_name_not_blank CHECK (btrim(display_name) <> '')
);

CREATE TABLE vessel_positions (
  vessel_id smallint NOT NULL REFERENCES vessels (id) ON DELETE RESTRICT,
  observed_at timestamptz NOT NULL,
  position geography(Point, 4326),
  course_deg double precision,
  heading_deg double precision,
  sog_knots double precision,
  quality_flags text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (vessel_id, observed_at),
  CONSTRAINT vessel_positions_course_range
    CHECK (course_deg IS NULL OR (course_deg >= 0 AND course_deg < 360)),
  CONSTRAINT vessel_positions_heading_range
    CHECK (heading_deg IS NULL OR (heading_deg >= 0 AND heading_deg <= 360)),
  CONSTRAINT vessel_positions_speed_non_negative
    CHECK (sog_knots IS NULL OR sog_knots >= 0),
  CONSTRAINT vessel_positions_quality_flags_not_empty
    CHECK (array_position(quality_flags, '') IS NULL)
);

CREATE INDEX vessel_positions_vessel_time_idx
  ON vessel_positions (vessel_id, observed_at DESC);

CREATE INDEX vessel_positions_position_gist_idx
  ON vessel_positions USING gist (position);

CREATE TABLE vessel_motions (
  vessel_id smallint NOT NULL REFERENCES vessels (id) ON DELETE RESTRICT,
  observed_at timestamptz NOT NULL,
  c1 double precision,
  c2 double precision,
  c3 double precision,
  c_total double precision,
  parametric_roll_flag double precision,
  pitch_acceleration_deg_s2 double precision,
  pitch_motion_deg double precision,
  pitch_period_seconds double precision,
  pitch_velocity_deg_s double precision,
  roll_acceleration_deg_s2 double precision,
  roll_motion_deg double precision,
  roll_period_seconds double precision,
  roll_velocity_deg_s double precision,
  x_acceleration_m_s2 double precision,
  x_motion_m double precision,
  x_velocity_m_s double precision,
  y_acceleration_m_s2 double precision,
  y_motion_m double precision,
  y_velocity_m_s double precision,
  yaw_acceleration_deg_s2 double precision,
  yaw_motion_deg double precision,
  yaw_velocity_deg_s double precision,
  z_acceleration_m_s2 double precision,
  z_motion_m double precision,
  z_velocity_m_s double precision,
  quality_flags text[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (vessel_id, observed_at),
  CONSTRAINT vessel_motions_quality_flags_not_empty
    CHECK (array_position(quality_flags, '') IS NULL)
);

CREATE INDEX vessel_motions_vessel_time_idx
  ON vessel_motions (vessel_id, observed_at DESC);

COMMIT;
