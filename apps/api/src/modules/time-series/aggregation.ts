export type Resolution = 'raw' | '1h' | '6h' | '1d';

export interface RawSeriesPoint {
  timestamp: Date;
  value: number | null;
  qualityFlags: string[];
}

export interface SeriesPoint {
  timestamp: string;
  value: number | null;
  qualityFlags: string[];
  minimum?: number;
  maximum?: number;
  sampleCount?: number;
}

const BUCKET_MS: Record<Exclude<Resolution, 'raw'>, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
};

function circularMean(values: number[]): number {
  const sin = values.reduce(
    (sum, value) => sum + Math.sin((value * Math.PI) / 180),
    0,
  );
  const cos = values.reduce(
    (sum, value) => sum + Math.cos((value * Math.PI) / 180),
    0,
  );
  return (
    (Math.atan2(sin / values.length, cos / values.length) * 180) / Math.PI +
    (360 % 360)
  );
}

export function aggregateSeries(
  points: RawSeriesPoint[],
  resolution: Resolution,
  directional: boolean,
): SeriesPoint[] {
  if (resolution === 'raw') {
    return points.map((point) => ({
      timestamp: point.timestamp.toISOString().replace('.000Z', 'Z'),
      value: point.value,
      qualityFlags: point.qualityFlags,
    }));
  }

  const bucketSize = BUCKET_MS[resolution];
  const buckets = new Map<number, RawSeriesPoint[]>();
  for (const point of points) {
    const bucket =
      Math.floor(point.timestamp.getTime() / bucketSize) * bucketSize;
    const existing = buckets.get(bucket) ?? [];
    existing.push(point);
    buckets.set(bucket, existing);
  }

  return [...buckets.entries()].map(([bucket, bucketPoints]) => {
    const values = bucketPoints.flatMap((point) =>
      point.value === null ? [] : [point.value],
    );
    const value =
      values.length === 0
        ? null
        : directional
          ? ((circularMean(values) % 360) + 360) % 360
          : values.reduce((sum, item) => sum + item, 0) / values.length;
    return {
      timestamp: new Date(bucket).toISOString().replace('.000Z', 'Z'),
      value,
      minimum: values.length > 0 ? Math.min(...values) : undefined,
      maximum: values.length > 0 ? Math.max(...values) : undefined,
      sampleCount: values.length,
      qualityFlags: [
        ...new Set(bucketPoints.flatMap((point) => point.qualityFlags)),
      ],
    };
  });
}

export function resolveAutoResolution(from: Date, to: Date): Resolution {
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 7) return 'raw';
  if (days <= 31) return '1h';
  if (days <= 180) return '6h';
  return '1d';
}
