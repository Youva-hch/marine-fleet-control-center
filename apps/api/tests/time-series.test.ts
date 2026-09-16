import { describe, expect, it } from 'vitest';

import { aggregateSeries } from '../src/modules/time-series/aggregation.js';

describe('time-series aggregation', () => {
  it('computes statistics for continuous values', () => {
    const result = aggregateSeries(
      [
        {
          timestamp: new Date('2026-03-01T00:00:00Z'),
          value: 2,
          qualityFlags: [],
        },
        {
          timestamp: new Date('2026-03-01T00:15:00Z'),
          value: 4,
          qualityFlags: [],
        },
      ],
      '1h',
      false,
    );
    expect(result[0]).toMatchObject({
      value: 3,
      minimum: 2,
      maximum: 4,
      sampleCount: 2,
    });
  });

  it('uses a circular mean for directions around north', () => {
    const result = aggregateSeries(
      [
        {
          timestamp: new Date('2026-03-01T00:00:00Z'),
          value: 359,
          qualityFlags: [],
        },
        {
          timestamp: new Date('2026-03-01T00:15:00Z'),
          value: 1,
          qualityFlags: [],
        },
      ],
      '1h',
      true,
    );
    expect(result[0]!.value).toBeCloseTo(0, 8);
  });
});
