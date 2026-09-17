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
}

const colours: Record<string, string> = {
  IMO1: '#38bdf8',
  IMO2: '#c084fc',
  IMO3: '#fb7185',
};

export function App() {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selected, setSelected] = useState(['IMO1']);
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
        <button className="play" type="button" disabled>
          <span>▶</span> Start replay
        </button>
      </header>

      <section className="map-stage">
        <div className="ocean-grid" />
        <div className="longitude-line one" />
        <div className="longitude-line two" />
        <div className="mock-track track-one" />
        <div className="mock-track track-two" />

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
        </aside>

        <div className="map-heading">
          <p>LIVE VIEW · HISTORICAL DATA</p>
          <h2>Fleet trajectory</h2>
          <span>
            {selected.length} vessel{selected.length === 1 ? '' : 's'} · 97
            observations
          </span>
        </div>
        <div className="map-tools">
          <button type="button">＋</button>
          <button type="button">−</button>
          <button type="button">⌖</button>
        </div>
        <div className="map-prompt">
          <i>⌁</i>
          <strong>Charted waters</strong>
          <span>Interactive map loading next</span>
        </div>

        <section className="timeline">
          <div className="timeline-head">
            <div>
              <small>TELEMETRY</small>
              <strong>{activeVariable?.label ?? 'Speed over ground'}</strong>
            </div>
            <span>{activeVariable?.unit ?? 'kn'}</span>
          </div>
          <div className="plot">
            <div className="plot-grid" />
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none">
              <path d="M0 91 C80 65 120 104 200 57 S320 28 405 74 S530 100 610 48 S735 22 800 61 S920 87 1000 40" />
            </svg>
            <div className="cursor" />
          </div>
          <div className="times">
            <span>00:15</span>
            <span>06:15</span>
            <span>12:15</span>
            <span>18:15</span>
            <span>00:15</span>
          </div>
        </section>
      </section>
    </main>
  );
}
