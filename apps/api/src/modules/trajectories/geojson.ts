import type { TrajectoryPoint } from './query.js';

const GAP_THRESHOLD_MS = 30 * 60 * 1000;

export function splitTrajectory(
  points: TrajectoryPoint[],
): TrajectoryPoint[][] {
  const segments: TrajectoryPoint[][] = [];
  let current: TrajectoryPoint[] = [];

  for (const point of points) {
    const previous = current.at(-1);
    const startsNewSegment =
      previous !== undefined &&
      (previous.vesselId !== point.vesselId ||
        point.observedAt.getTime() - previous.observedAt.getTime() >
          GAP_THRESHOLD_MS ||
        Math.abs(point.longitude - previous.longitude) > 180);

    if (startsNewSegment) {
      if (current.length > 0) segments.push(current);
      current = [];
    }
    current.push(point);
  }

  if (current.length > 0) segments.push(current);
  return segments;
}

function downsampleVesselSegments(
  segments: TrajectoryPoint[][],
  maxPoints: number,
) {
  const totalPoints = segments.reduce(
    (total, segment) => total + segment.length,
    0,
  );
  if (totalPoints <= maxPoints) return { segments, downsampled: false };

  const mandatory = segments.flatMap((segment) =>
    segment.length <= 1 ? segment : [segment[0]!, segment.at(-1)!],
  );
  const interior = segments.flatMap((segment) => segment.slice(1, -1));
  const availableSlots = Math.max(0, maxPoints - mandatory.length);
  const selectedInterior = new Set<TrajectoryPoint>();

  for (let index = 0; index < availableSlots; index += 1) {
    const candidateIndex = Math.floor(
      (index * interior.length) / availableSlots,
    );
    const candidate = interior[candidateIndex];
    if (candidate) selectedInterior.add(candidate);
  }

  const selected = new Set([...mandatory, ...selectedInterior]);
  return {
    segments: segments.map((segment) =>
      segment.filter((point) => selected.has(point)),
    ),
    downsampled: true,
  };
}

function downsampleSegments(segments: TrajectoryPoint[][], maxPoints: number) {
  const byVessel = new Map<string, TrajectoryPoint[][]>();
  for (const segment of segments) {
    const vesselId = segment[0]?.vesselId;
    if (!vesselId) continue;
    const vesselSegments = byVessel.get(vesselId) ?? [];
    vesselSegments.push(segment);
    byVessel.set(vesselId, vesselSegments);
  }

  const sampled = [...byVessel.values()].map((vesselSegments) =>
    downsampleVesselSegments(vesselSegments, maxPoints),
  );
  return {
    segments: sampled.flatMap((result) => result.segments),
    downsampled: sampled.some((result) => result.downsampled),
  };
}

export function buildFeatureCollection(
  points: TrajectoryPoint[],
  variable: string,
  unit: string,
  maxPoints: number,
) {
  const sampled = downsampleSegments(splitTrajectory(points), maxPoints);
  const features = sampled.segments
    .filter((segment) => segment.length >= 2)
    .map((segment, segmentIndex) => ({
      type: 'Feature' as const,
      id: `${segment[0]!.vesselId}:${segment[0]!.observedAt.toISOString()}:${segmentIndex}`,
      geometry: {
        type: 'LineString' as const,
        coordinates: segment.map((point) => [point.longitude, point.latitude]),
      },
      properties: {
        vesselId: segment[0]!.vesselId,
        segmentIndex,
        timestamps: segment.map((point) =>
          point.observedAt.toISOString().replace('.000Z', 'Z'),
        ),
        values: segment.map((point) => point.value),
        variable,
        unit,
        qualityFlags: [
          ...new Set(segment.flatMap((point) => point.qualityFlags)),
        ],
      },
    }));

  return {
    collection: { type: 'FeatureCollection' as const, features },
    downsampled: sampled.downsampled,
  };
}
