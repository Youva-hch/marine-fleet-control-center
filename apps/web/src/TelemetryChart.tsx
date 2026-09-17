import { useEffect, useMemo, useState } from 'react';

interface SeriesPoint {
  timestamp: string;
  value: number | null;
}

interface Series {
  vesselId: string;
  points: SeriesPoint[];
}

interface Response {
  data: Series[];
  metadata: { resolution: string };
}

interface Props {
  vessels: string[];
  variable: string;
  variableLabel: string;
  unit: string;
  from: string;
  to: string;
  colours: Record<string, string>;
  replayTimestamp: number;
  onSeek: (timestamp: number) => void;
}

const utc = (value: string) =>
  new Date(`${value}:00Z`).toISOString().replace('.000Z', 'Z');

const linePatterns: Record<string, string | undefined> = {
  IMO1: undefined,
  IMO2: '8 5',
  IMO3: '2 5',
};

const formatTime = (timestamp: number, includeDate: boolean) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: includeDate ? '2-digit' : undefined,
    month: includeDate ? 'short' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);

export function TelemetryChart({
  vessels,
  variable,
  variableLabel,
  unit,
  from,
  to,
  colours,
  replayTimestamp,
  onSeek,
}: Props) {
  const [response, setResponse] = useState<Response | null>(null);
  const [hoverRatio, setHoverRatio] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>(
    'loading',
  );

  useEffect(() => {
    if (!vessels.length) {
      setResponse(null);
      setState('empty');
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      vessels: vessels.join(','),
      variables: variable,
      from: utc(from),
      to: utc(to),
      resolution: 'auto',
    });
    setState('loading');
    fetch(`/api/v1/time-series?${query}`, { signal: controller.signal })
      .then(async (result) => {
        if (!result.ok)
          throw new Error(`Telemetry request failed: ${result.status}`);
        return result.json() as Promise<Response>;
      })
      .then((data) => {
        setResponse(data);
        setState(
          data.data.some((series) =>
            series.points.some((point) => point.value !== null),
          )
            ? 'ready'
            : 'empty',
        );
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setState('error');
      });

    return () => controller.abort();
  }, [from, to, variable, vessels]);

  const chart = useMemo(() => {
    const start = new Date(`${from}:00Z`).getTime();
    const end = new Date(`${to}:00Z`).getTime();
    const values =
      response?.data.flatMap((series) =>
        series.points.flatMap((point) =>
          point.value === null ? [] : [point.value],
        ),
      ) ?? [];
    const minimum = values.length ? Math.min(...values) : 0;
    const maximum = values.length ? Math.max(...values) : 1;
    const span = maximum - minimum || 1;
    const duration = end - start || 1;
    const replayRatio = Math.min(
      1,
      Math.max(0, (replayTimestamp - start) / duration),
    );

    const paths = (response?.data ?? []).map((series) => {
      let drawing = false;
      const path = series.points
        .map((point) => {
          if (point.value === null) {
            drawing = false;
            return '';
          }
          const x =
            ((new Date(point.timestamp).getTime() - start) / duration) * 1000;
          const y = 108 - ((point.value - minimum) / span) * 96;
          const command = drawing ? 'L' : 'M';
          drawing = true;
          return `${command}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');
      return { ...series, path };
    });

    const hoverTimestamp =
      hoverRatio === null ? null : start + (end - start) * hoverRatio;
    const hoverPoints =
      hoverTimestamp === null
        ? []
        : (response?.data ?? []).flatMap((series) => {
            const valid = series.points.filter(
              (point): point is SeriesPoint & { value: number } =>
                point.value !== null,
            );
            if (!valid.length) return [];
            const point = valid.reduce((nearest, candidate) =>
              Math.abs(
                new Date(candidate.timestamp).getTime() - hoverTimestamp,
              ) <
              Math.abs(new Date(nearest.timestamp).getTime() - hoverTimestamp)
                ? candidate
                : nearest,
            );
            return [
              {
                vesselId: series.vesselId,
                value: point.value,
                timestamp: new Date(point.timestamp).getTime(),
                x:
                  ((new Date(point.timestamp).getTime() - start) / duration) *
                  1000,
                y: 108 - ((point.value - minimum) / span) * 96,
              },
            ];
          });

    const includeDate = end - start > 24 * 60 * 60 * 1000;
    const labels = Array.from({ length: 5 }, (_, index) =>
      formatTime(start + ((end - start) * index) / 4, includeDate),
    );
    return {
      paths,
      labels,
      minimum,
      maximum,
      count: values.length,
      hoverTimestamp,
      hoverPoints,
      replayRatio,
    };
  }, [from, hoverRatio, replayTimestamp, response, to]);

  return (
    <article className="telemetry-card">
      <div className="timeline-head">
        <div>
          <small>TELEMETRY</small>
          <strong>{variableLabel}</strong>
          {state === 'ready' && (
            <em>
              {chart.count.toLocaleString()} points ·{' '}
              {response?.metadata.resolution}
            </em>
          )}
        </div>
        <div className="telemetry-legend" aria-label="Selected vessels">
          {vessels.map((vessel) => (
            <span key={vessel}>
              <i
                style={{
                  borderColor: colours[vessel],
                  borderTopStyle:
                    vessel === 'IMO1'
                      ? 'solid'
                      : vessel === 'IMO2'
                        ? 'dashed'
                        : 'dotted',
                }}
              />
              {vessel}
            </span>
          ))}
        </div>
        <span>{unit}</span>
      </div>
      <div
        className="plot"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setHoverRatio(
            Math.min(
              1,
              Math.max(0, (event.clientX - bounds.left) / bounds.width),
            ),
          );
        }}
        onPointerLeave={() => setHoverRatio(null)}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = Math.min(
            1,
            Math.max(0, (event.clientX - bounds.left) / bounds.width),
          );
          const start = new Date(`${from}:00Z`).getTime();
          const end = new Date(`${to}:00Z`).getTime();
          onSeek(start + (end - start) * ratio);
        }}
      >
        <div className="plot-grid" />
        {state === 'ready' ? (
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" role="img">
            {chart.paths.map((series) => (
              <path
                className="telemetry-outline"
                key={`${series.vesselId}-outline`}
                d={series.path}
                style={{ strokeDasharray: linePatterns[series.vesselId] }}
              />
            ))}
            {chart.paths.map((series) => (
              <path
                className="telemetry-line"
                key={series.vesselId}
                d={series.path}
                style={{
                  stroke: colours[series.vesselId],
                  strokeDasharray: linePatterns[series.vesselId],
                }}
              />
            ))}
            {chart.hoverPoints.map((point) => (
              <circle
                key={`${point.vesselId}-hover`}
                cx={point.x}
                cy={point.y}
                r="5"
                style={{ fill: colours[point.vesselId] }}
              />
            ))}
          </svg>
        ) : (
          <div className={`telemetry-state ${state}`}>
            {state === 'loading'
              ? 'Loading telemetry…'
              : state === 'empty'
                ? 'No telemetry for this selection'
                : 'Telemetry unavailable'}
          </div>
        )}
        {state === 'ready' && (
          <div className="plot-range">
            <span>{chart.maximum.toFixed(1)}</span>
            <span>{chart.minimum.toFixed(1)}</span>
          </div>
        )}
        {state === 'ready' && (
          <div
            className="replay-cursor"
            style={{ left: `${chart.replayRatio * 100}%` }}
          >
            <time>{formatTime(replayTimestamp, true)}</time>
          </div>
        )}
        {state === 'ready' &&
          hoverRatio !== null &&
          chart.hoverTimestamp !== null && (
            <>
              <div
                className="telemetry-cursor"
                style={{ left: `${hoverRatio * 100}%` }}
              />
              <div
                className="telemetry-tooltip"
                style={{
                  left: `${Math.min(86, Math.max(14, hoverRatio * 100))}%`,
                }}
              >
                <time>{formatTime(chart.hoverTimestamp, true)} UTC</time>
                {chart.hoverPoints.map((point) => (
                  <span key={point.vesselId}>
                    <i style={{ background: colours[point.vesselId] }} />
                    <b>{point.vesselId}</b>
                    <strong>
                      {point.value.toFixed(2)} {unit}
                    </strong>
                  </span>
                ))}
              </div>
            </>
          )}
        <input
          className="replay-scrubber"
          type="range"
          aria-label="Replay timestamp"
          min={new Date(`${from}:00Z`).getTime()}
          max={new Date(`${to}:00Z`).getTime()}
          step={15 * 60 * 1000}
          value={replayTimestamp}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onSeek(Number(event.target.value))}
        />
      </div>
      <div className="times">
        {chart.labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </article>
  );
}
