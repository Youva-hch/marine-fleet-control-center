import { describe, expect, it } from 'vitest';

import {
  buildFeatureCollection,
  splitTrajectory,
} from '../src/modules/trajectories/geojson.js';
import type { TrajectoryPoint } from '../src/modules/trajectories/query.js';

function point(timestamp: string, longitude: number): TrajectoryPoint {
  return {
    vesselId: 'IMO1',
    observedAt: new Date(timestamp),
    longitude,
    latitude: 10,
    value: 1,
    qualityFlags: [],
  };
}

describe('trajectory segmentation', () => {
  it('splits a trajectory after a gap over 30 minutes', () => {
    const segments = splitTrajectory([
      point('2026-03-01T00:00:00Z', 10),
      point('2026-03-01T00:15:00Z', 11),
      point('2026-03-01T01:00:00Z', 12),
    ]);

    expect(segments.map((segment) => segment.length)).toEqual([2, 1]);
  });

  it('splits a trajectory at an antimeridian crossing', () => {
    const segments = splitTrajectory([
      point('2026-03-01T00:00:00Z', 179),
      point('2026-03-01T00:15:00Z', -179),
    ]);

    expect(segments.map((segment) => segment.length)).toEqual([1, 1]);
  });

  it('downsamples deterministically while preserving segment endpoints', () => {
    const points = Array.from({ length: 200 }, (_, index) =>
      point(
        new Date(Date.UTC(2026, 2, 1, 0, index * 15)).toISOString(),
        index / 10,
      ),
    );

    const result = buildFeatureCollection(points, 'sogKnots', 'kn', 100);
    const coordinates = result.collection.features[0]!.geometry.coordinates;

    expect(result.downsampled).toBe(true);
    expect(coordinates).toHaveLength(100);
    expect(coordinates[0]).toEqual([0, 10]);
    expect(coordinates.at(-1)).toEqual([19.9, 10]);
  });
});
