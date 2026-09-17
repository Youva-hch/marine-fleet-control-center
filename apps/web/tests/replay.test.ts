import { describe, expect, it } from 'vitest';

import { locateReplayPositions, type ReplayTrack } from '../src/replay.js';

describe('replay positions', () => {
  const track: ReplayTrack = {
    vesselId: 'IMO1',
    coordinates: [
      [0, 10],
      [10, 20],
      [20, 30],
    ],
    timestamps: [1_000, 2_000, 3_000],
  };

  it('interpolates between adjacent observations', () => {
    expect(locateReplayPositions([track], 1_500)).toEqual([
      { vesselId: 'IMO1', coordinates: [5, 15] },
    ]);
  });

  it('returns the exact final observation', () => {
    expect(locateReplayPositions([track], 3_000)).toEqual([
      { vesselId: 'IMO1', coordinates: [20, 30] },
    ]);
  });

  it('does not interpolate across separate trajectory segments', () => {
    const segments: ReplayTrack[] = [
      { vesselId: 'IMO1', coordinates: [[0, 0]], timestamps: [1_000] },
      { vesselId: 'IMO1', coordinates: [[20, 20]], timestamps: [3_000] },
    ];
    expect(locateReplayPositions(segments, 2_000)).toEqual([]);
  });

  it('keeps positions independent for multiple vessels', () => {
    const second: ReplayTrack = {
      ...track,
      vesselId: 'IMO2',
      coordinates: [
        [20, 30],
        [30, 40],
        [40, 50],
      ],
    };
    expect(locateReplayPositions([track, second], 1_500)).toEqual([
      { vesselId: 'IMO1', coordinates: [5, 15] },
      { vesselId: 'IMO2', coordinates: [25, 35] },
    ]);
  });
});
