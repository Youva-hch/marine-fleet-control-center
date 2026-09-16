export interface VariableMetadata {
  id: string;
  label: string;
  unit: string;
  category: 'navigation' | 'motion' | 'parametric-roll';
  supportsTrajectoryColour: boolean;
  supportsTimeSeries: boolean;
}

function variable(
  id: string,
  label: string,
  unit: string,
  category: VariableMetadata['category'],
): VariableMetadata {
  return {
    id,
    label,
    unit,
    category,
    supportsTrajectoryColour: true,
    supportsTimeSeries: true,
  };
}

export const VARIABLE_CATALOG: readonly VariableMetadata[] = [
  variable('courseDeg', 'Course over ground', 'deg', 'navigation'),
  variable('headingDeg', 'Heading', 'deg', 'navigation'),
  variable('sogKnots', 'Speed over ground', 'kn', 'navigation'),
  variable('c1', 'Parametric roll C1', '-', 'parametric-roll'),
  variable('c2', 'Parametric roll C2', '-', 'parametric-roll'),
  variable('c3', 'Parametric roll C3', '-', 'parametric-roll'),
  variable('cTotal', 'Parametric roll total', '-', 'parametric-roll'),
  variable(
    'parametricRollFlag',
    'Parametric roll indicator',
    '-',
    'parametric-roll',
  ),
  variable('pitchAccelerationDegS2', 'Pitch acceleration', 'deg/s²', 'motion'),
  variable('pitchMotionDeg', 'Pitch motion', 'deg', 'motion'),
  variable('pitchPeriodSeconds', 'Pitch period', 's', 'motion'),
  variable('pitchVelocityDegS', 'Pitch velocity', 'deg/s', 'motion'),
  variable('rollAccelerationDegS2', 'Roll acceleration', 'deg/s²', 'motion'),
  variable('rollMotionDeg', 'Roll motion', 'deg', 'motion'),
  variable('rollPeriodSeconds', 'Roll period', 's', 'motion'),
  variable('rollVelocityDegS', 'Roll velocity', 'deg/s', 'motion'),
  variable('xAccelerationMS2', 'X acceleration', 'm/s²', 'motion'),
  variable('xMotionM', 'X motion', 'm', 'motion'),
  variable('xVelocityMS', 'X velocity', 'm/s', 'motion'),
  variable('yAccelerationMS2', 'Y acceleration', 'm/s²', 'motion'),
  variable('yMotionM', 'Y motion', 'm', 'motion'),
  variable('yVelocityMS', 'Y velocity', 'm/s', 'motion'),
  variable('yawAccelerationDegS2', 'Yaw acceleration', 'deg/s²', 'motion'),
  variable('yawMotionDeg', 'Yaw motion', 'deg', 'motion'),
  variable('yawVelocityDegS', 'Yaw velocity', 'deg/s', 'motion'),
  variable('zAccelerationMS2', 'Z acceleration', 'm/s²', 'motion'),
  variable('zMotionM', 'Z motion', 'm', 'motion'),
  variable('zVelocityMS', 'Z velocity', 'm/s', 'motion'),
];
