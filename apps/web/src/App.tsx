import { useEffect, useMemo, useRef, useState } from 'react';
import { MapView } from './MapView.js';
import { TelemetryChart } from './TelemetryChart.js';

interface Vessel {
  id: string;
  name: string;
  gpsObservationCount: number;
}
interface Variable {
  id: string;
  label: string;
  unit: string;
  supportsTimeSeries: boolean;
}

const colours: Record<string, string> = {
  IMO1: '#38bdf8',
  IMO2: '#c084fc',
  IMO3: '#fb7185',
};
const REPLAY_DURATION_MS = 30_000;

export function App() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selected, setSelected] = useState(['IMO1']);
  const [variable, setVariable] = useState('sogKnots');
  const [telemetryVariables, setTelemetryVariables] = useState(['sogKnots']);
  const [from, setFrom] = useState('2026-03-01T00:15');
  const [to, setTo] = useState('2026-03-02T00:15');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const replayRange = useMemo(
    () => ({
      start: new Date(`${from}:00Z`).getTime(),
      end: new Date(`${to}:00Z`).getTime(),
    }),
    [from, to],
  );
  const [replayTimestamp, setReplayTimestamp] = useState(replayRange.start);
  const [isPlaying, setIsPlaying] = useState(false);
  const replayTimestampRef = useRef(replayTimestamp);

  useEffect(() => {
    replayTimestampRef.current = replayTimestamp;
  }, [replayTimestamp]);

  useEffect(() => {
    setIsPlaying(false);
    setReplayTimestamp(replayRange.start);
  }, [
    replayRange.start,
    replayRange.end,
    selected,
    telemetryVariables,
    variable,
  ]);

  useEffect(() => {
    if (!isPlaying || replayRange.end <= replayRange.start) return;
    let frame = 0;
    let previous = performance.now();
    const advance = (now: number) => {
      const elapsed = now - previous;
      previous = now;
      const timePerMillisecond =
        (replayRange.end - replayRange.start) / REPLAY_DURATION_MS;
      const next = replayTimestampRef.current + elapsed * timePerMillisecond;
      if (next >= replayRange.end) {
        replayTimestampRef.current = replayRange.end;
        setReplayTimestamp(replayRange.end);
        setIsPlaying(false);
        return;
      }
      replayTimestampRef.current = next;
      setReplayTimestamp(next);
      frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, replayRange.end, replayRange.start]);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/vessels').then((response) => response.json()),
      fetch('/api/v1/variables').then((response) => response.json()),
    ])
      .then(([vesselResponse, variableResponse]) => {
        setVessels(vesselResponse.data);
        setVariables(variableResponse.data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const activeVariable = useMemo(
    () => variables.find((item) => item.id === variable),
    [variable, variables],
  );

  function toggleVessel(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleTelemetryVariable(id: string) {
    setTelemetryVariables((current) => {
      if (current.includes(id)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== id);
      }
      return current.length >= 3 ? current : [...current, id];
    });
  }

  return (
    <main className="control-room">
      <header className="masthead">
        <div className="wordmark">
          <span>F</span>
          <div>
            <strong>Fleet Control</strong>
            <small>Voyage intelligence</small>
          </div>
        </div>
        <div className="system-status">
          <i className={status} />
          <span>{status === 'ready' ? 'Systems online' : status}</span>
        </div>
        <button
          className={`play ${isPlaying ? 'active' : ''}`}
          type="button"
          disabled={!selected.length || replayRange.end <= replayRange.start}
          onClick={() => {
            if (isPlaying) {
              setIsPlaying(false);
              return;
            }
            if (replayTimestamp >= replayRange.end) {
              replayTimestampRef.current = replayRange.start;
              setReplayTimestamp(replayRange.start);
            }
            setIsPlaying(true);
          }}
        >
          <span>{isPlaying ? 'Ⅱ' : '▶'}</span>{' '}
          {isPlaying ? 'Pause replay' : 'Start replay'}
        </button>
      </header>

      <section className="map-stage">
        <MapView
          vessels={selected}
          from={from}
          to={to}
          variable={variable}
          replayTimestamp={replayTimestamp}
        />

        <aside className="control-panel">
          <div className="panel-title">
            <p>EXPEDITION 01</p>
            <h1>
              North Atlantic
              <br />
              crossing
            </h1>
            <span>01–02 March 2026</span>
          </div>

          <section className="control-section">
            <div className="section-label">
              <span>Vessels</span>
              <small>{selected.length}/3 selected</small>
            </div>
            <div className="vessels">
              {vessels.map((vessel) => {
                const isSelected = selected.includes(vessel.id);
                return (
                  <button
                    key={vessel.id}
                    type="button"
                    className={isSelected ? 'active' : ''}
                    onClick={() => toggleVessel(vessel.id)}
                  >
                    <i style={{ background: colours[vessel.id] }} />
                    <span>
                      <strong>{vessel.name}</strong>
                      <small>
                        {vessel.gpsObservationCount.toLocaleString()} positions
                      </small>
                    </span>
                    <b>{isSelected ? '✓' : '+'}</b>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="control-section dates">
            <div className="section-label">
              <span>Time window</span>
              <small>UTC</small>
            </div>
            <label>
              <span>From</span>
              <input
                type="datetime-local"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="datetime-local"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </section>

          <section className="control-section">
            <div className="section-label">
              <span>Colour metric</span>
              <small>{activeVariable?.unit}</small>
            </div>
            <select
              value={variable}
              onChange={(event) => setVariable(event.target.value)}
            >
              {variables.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="colour-ramp" />
            <div className="ramp-labels">
              <span>Low</span>
              <span>High</span>
            </div>
          </section>

          <section className="control-section">
            <div className="section-label">
              <span>Telemetry</span>
              <small>{telemetryVariables.length}/3 metrics</small>
            </div>
            <details className="metric-picker">
              <summary>
                {telemetryVariables.length === 1
                  ? variables.find((item) => item.id === telemetryVariables[0])
                      ?.label
                  : `${telemetryVariables.length} metrics selected`}
              </summary>
              <div className="metric-options">
                {variables
                  .filter((item) => item.supportsTimeSeries)
                  .map((item) => {
                    const checked = telemetryVariables.includes(item.id);
                    return (
                      <label key={item.id}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && telemetryVariables.length >= 3}
                          onChange={() => toggleTelemetryVariable(item.id)}
                        />
                        <span>{item.label}</span>
                        <small>{item.unit}</small>
                      </label>
                    );
                  })}
              </div>
            </details>
          </section>
        </aside>

        <div className="map-heading">
          <p>LIVE VIEW · HISTORICAL DATA</p>
          <h2>Fleet trajectory</h2>
          <span>
            {selected.length} vessel{selected.length === 1 ? '' : 's'} · 97
            observations
          </span>
        </div>
        <section className="timeline">
          <div className="telemetry-deck">
            {telemetryVariables.map((telemetryVariable) => {
              const metadata = variables.find(
                (item) => item.id === telemetryVariable,
              );
              return (
                <TelemetryChart
                  key={telemetryVariable}
                  vessels={selected}
                  variable={telemetryVariable}
                  variableLabel={metadata?.label ?? telemetryVariable}
                  unit={metadata?.unit ?? ''}
                  from={from}
                  to={to}
                  colours={colours}
                  replayTimestamp={replayTimestamp}
                  onSeek={(timestamp) => {
                    setIsPlaying(false);
                    setReplayTimestamp(timestamp);
                  }}
                />
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
