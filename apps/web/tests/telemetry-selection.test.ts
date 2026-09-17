import { describe, expect, it } from 'vitest';

import { toggleTelemetrySelection } from '../src/telemetry-selection.js';

describe('telemetry selection', () => {
  it('adds metrics until the maximum is reached', () => {
    expect(toggleTelemetrySelection(['speed'], 'roll')).toEqual([
      'speed',
      'roll',
    ]);
    expect(toggleTelemetrySelection(['speed', 'roll', 'pitch'], 'yaw')).toEqual(
      ['speed', 'roll', 'pitch'],
    );
  });

  it('removes a metric while preserving at least one', () => {
    expect(toggleTelemetrySelection(['speed', 'roll'], 'roll')).toEqual([
      'speed',
    ]);
    expect(toggleTelemetrySelection(['speed'], 'speed')).toEqual(['speed']);
  });
});
