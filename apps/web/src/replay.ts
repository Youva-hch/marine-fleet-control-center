export interface ReplayTrack {
  vesselId: string;
  coordinates: number[][];
  timestamps: number[];
}

export interface ReplayPosition {
  vesselId: string;
  coordinates: [number, number];
}

export function locateReplayPositions(
  tracks: ReplayTrack[],
  replayTimestamp: number,
): ReplayPosition[] {
  const positions = new Map<string, [number, number]>();

  for (const track of tracks) {
    const first = track.timestamps[0];
    const last = track.timestamps.at(-1);
    if (first === undefined || last === undefined) continue;
    if (replayTimestamp < first || replayTimestamp > last) continue;

    let low = 0;
    let high = track.timestamps.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (track.timestamps[middle]! <= replayTimestamp) low = middle;
      else high = middle - 1;
    }

    const nextIndex = Math.min(low + 1, track.timestamps.length - 1);
    const startTime = track.timestamps[low]!;
    const endTime = track.timestamps[nextIndex]!;
    const ratio =
      endTime === startTime
        ? 0
        : (replayTimestamp - startTime) / (endTime - startTime);
    const startCoordinate = track.coordinates[low]!;
    const endCoordinate = track.coordinates[nextIndex]!;
    positions.set(track.vesselId, [
      startCoordinate[0]! + (endCoordinate[0]! - startCoordinate[0]!) * ratio,
      startCoordinate[1]! + (endCoordinate[1]! - startCoordinate[1]!) * ratio,
    ]);
  }

  return [...positions].map(([vesselId, coordinates]) => ({
    vesselId,
    coordinates,
  }));
}
