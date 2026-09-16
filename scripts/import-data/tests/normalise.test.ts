import { describe, expect, it } from 'vitest';

import {
  normalisePosition,
  parseOptionalNumber,
  parseUtcTimestamp,
} from '../src/normalise.js';

const baseRecord = {
  Timestamp: '2026-03-01 00:15:00',
  'Course [deg] (NAVIGATION)': '360',
  'Heading [deg] (NAVIGATION)': '120.12',
  'Latitude [deg] (NAVIGATION)': '32.53',
  'Longitude [deg] (NAVIGATION)': '-79.48',
  'Speed [kn] (NAVIGATION)': '0.58',
};

describe('CSV normalisation', () => {
  it('parses source timestamps explicitly as UTC', () => {
    expect(parseUtcTimestamp('2026-03-01 00:15:00').toISOString()).toBe(
      '2026-03-01T00:15:00.000Z',
    );
  });

  it('preserves missing numeric values as null', () => {
    expect(parseOptionalNumber('')).toBeNull();
    expect(parseOptionalNumber('  ')).toBeNull();
    expect(parseOptionalNumber('0')).toBe(0);
  });

  it('normalises course 360 to zero and records the change', () => {
    const row = normalisePosition(baseRecord);
    expect(row.courseDeg).toBe(0);
    expect(row.qualityFlags).toContain('course_normalised_360');
  });

  it('keeps an incomplete row while removing an unusable position', () => {
    const row = normalisePosition({
      ...baseRecord,
      'Latitude [deg] (NAVIGATION)': '',
      'Longitude [deg] (NAVIGATION)': '',
    });
    expect(row.latitude).toBeNull();
    expect(row.longitude).toBeNull();
    expect(row.qualityFlags).toContain('missing_position');
  });
});
