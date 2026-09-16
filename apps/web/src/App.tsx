import { useEffect, useMemo, useState } from 'react';

interface Vessel {
  id: string;
  name: string;
  gpsObservationCount: number;
}
interface Variable {
  id: string;
  label: string;
  unit: string;
  category: string;
}

const vesselColours: Record<string, string> = {
  IMO1: '#67e8f9',
  IMO2: '#a78bfa',
  IMO3: '#fb7185',
};

export function App() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selectedVessels, setSelectedVessels] = useState(['IMO1']);
  const [variable, setVariable] = useState('sogKnots');
  const [from, setFrom] = useState('2026-03-01T00:15');
  const [to, setTo] = useState('2026-03-02T00:15');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

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

  const selectedVariable = useMemo(
    () => variables.find((item) => item.id === variable),
    [variable, variables],
  );

  function toggleVessel(id: string) {
    setSelectedVessels((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar glass-panel">
        <div className="window-lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand">
          <b>MF</b>
          <div>
            <strong>Fleet Control</strong>
            <small>Historical voyage replay</small>
          </div>
        </div>
        <div className="range-summary">
          <small>Selected window</small>
          <strong>01 Mar · 00:15 — 02 Mar · 00:15 UTC</strong>
        </div>
        <button className="replay-button" type="button" disabled>
          ▶ Replay
        </button>
      </header>

      <section className="workspace">
        <aside className="sidebar glass-panel">
          <div className="sidebar-heading">
            <div>
              <p className="eyebrow">Mission controls</p>
              <h1>Voyage explorer</h1>
            </div>
            <span className={`status-dot ${status}`} />
          </div>

          <fieldset>
            <legend>Vessels</legend>
            <p className="field-help">Select up to three vessels</p>
            <div className="vessel-list">
              {vessels.map((vessel) => {
                const selected = selectedVessels.includes(vessel.id);
                return (
                  <button
                    className={`vessel-option ${selected ? 'selected' : ''}`}
                    key={vessel.id}
                    type="button"
                    onClick={() => toggleVessel(vessel.id)}
                  >
                    <span
                      className="vessel-swatch"
                      style={{ background: vesselColours[vessel.id] }}
                    />
                    <span>
                      <strong>{vessel.name}</strong>
                      <small>
                        {vessel.gpsObservationCount.toLocaleString()} positions
                      </small>
                    </span>
                    <span className="checkmark">{selected ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Time window</legend>
            <label>
              From
              <input
                type="datetime-local"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="datetime-local"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>Trajectory colour</legend>
            <label>
              Variable
              <select
                value={variable}
                onChange={(event) => setVariable(event.target.value)}
              >
                {variables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} · {item.unit}
                  </option>
                ))}
              </select>
            </label>
            <div className="legend-scale">
              <span>Low</span>
              <div />
              <span>{selectedVariable?.unit ?? '—'}</span>
            </div>
          </fieldset>

          <div className="quality-note">
            <span>◇</span>
            <p>
              Gaps longer than 30 minutes remain visible. Missing measurements
              are never replaced by zero.
            </p>
          </div>
        </aside>

        <section className="content-grid">
          <article className="map-card glass-panel">
            <div className="card-toolbar">
              <div>
                <p className="eyebrow">Global trajectory</p>
                <h2>Fleet map</h2>
              </div>
              <div className="map-actions">
                <span>{selectedVessels.length} active</span>
                <button type="button" disabled>
                  Fit selection
                </button>
              </div>
            </div>
            <div className="map-placeholder">
              <div className="globe-grid" />
              <div className="route route-a" />
              <div className="route route-b" />
              <div className="map-message">
                <span>⌖</span>
                <strong>Map surface ready</strong>
                <p>MapLibre trajectories connect in the next step.</p>
              </div>
              <div className="map-stats">
                <span>97 observations</span>
                <span>24 hours</span>
                <span>{selectedVariable?.label ?? 'Loading…'}</span>
              </div>
            </div>
          </article>

          <article className="timeline-card glass-panel">
            <div className="card-toolbar">
              <div>
                <p className="eyebrow">Temporal profile</p>
                <h2>{selectedVariable?.label ?? 'Time series'}</h2>
              </div>
              <span className="unit-pill">{selectedVariable?.unit ?? '—'}</span>
            </div>
            <div className="chart-placeholder">
              <div className="chart-grid" />
              <svg viewBox="0 0 900 150" preserveAspectRatio="none">
                <path d="M0 110 C90 80 130 125 220 70 S350 30 430 85 S560 125 650 55 S790 35 900 72" />
              </svg>
              <div className="axis-labels">
                <span>00:15</span>
                <span>06:15</span>
                <span>12:15</span>
                <span>18:15</span>
                <span>00:15</span>
              </div>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
