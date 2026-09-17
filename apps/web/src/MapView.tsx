import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  vessels: string[];
  from: string;
  to: string;
  variable: string;
}
interface ApiFeature {
  geometry: { coordinates: number[][] };
  properties: { vesselId: string; values: Array<number | null> };
}
interface ApiResponse {
  features: ApiFeature[];
}
const utc = (value: string) =>
  new Date(`${value}:00Z`).toISOString().replace('.000Z', 'Z');

export function MapView({ vessels, from, to, variable }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>(
    'loading',
  );
  const [pointCount, setPointCount] = useState(0);

  useEffect(() => {
    if (!container.current || map.current) return;
    const instance = new maplibregl.Map({
      container: container.current,
      center: [-25, 25],
      zoom: 2,
      minZoom: 1.35,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          base: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'base',
            type: 'raster',
            source: 'base',
            paint: {
              'raster-saturation': -0.82,
              'raster-brightness-max': 0.38,
              'raster-contrast': 0.2,
            },
          },
        ],
      },
    });
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    );
    instance.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right',
    );
    instance.on('load', () => {
      instance.addSource('trajectories', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      instance.addLayer({
        id: 'trajectory-glow',
        type: 'line',
        source: 'trajectories',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'colour'],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            18,
            4,
            12,
            8,
            8,
          ],
          'line-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            0.3,
            6,
            0.16,
          ],
          'line-blur': 6,
        },
      });
      instance.addLayer({
        id: 'trajectory-lines',
        type: 'line',
        source: 'trajectories',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'colour'],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            1,
            6,
            4,
            4.5,
            8,
            3,
          ],
          'line-opacity': 0.95,
        },
      });
      setReady(true);
    });
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    const source = map.current.getSource('trajectories') as GeoJSONSource;
    if (!vessels.length) {
      source.setData({ type: 'FeatureCollection', features: [] });
      setState('empty');
      return;
    }
    const controller = new AbortController();
    setState('loading');
    const query = new URLSearchParams({
      vessels: vessels.join(','),
      from: utc(from),
      to: utc(to),
      colourBy: variable,
    });
    fetch(`/api/v1/trajectories?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<ApiResponse>;
      })
      .then((data) => {
        const values = data.features
          .flatMap((feature) => feature.properties.values)
          .filter((value): value is number => value !== null);
        const minimum = values.length ? Math.min(...values) : 0;
        const span = (values.length ? Math.max(...values) : 1) - minimum || 1;
        const features = data.features.flatMap((feature) =>
          feature.geometry.coordinates.slice(0, -1).map((coordinate, index) => {
            const value = feature.properties.values[index] ?? null;
            const ratio = value === null ? 0 : (value - minimum) / span;
            return {
              type: 'Feature' as const,
              geometry: {
                type: 'LineString' as const,
                coordinates: [
                  coordinate,
                  feature.geometry.coordinates[index + 1]!,
                ],
              },
              properties: {
                colour:
                  value === null
                    ? '#64748b'
                    : `hsl(${205 - ratio * 190} 88% 62%)`,
                value,
                vesselId: feature.properties.vesselId,
              },
            };
          }),
        );
        source.setData({ type: 'FeatureCollection', features });
        const coordinates = data.features.flatMap(
          (feature) => feature.geometry.coordinates,
        );
        setPointCount(coordinates.length);
        if (coordinates.length) {
          const bounds = coordinates.reduce(
            (current, coordinate) =>
              current.extend(coordinate as [number, number]),
            new maplibregl.LngLatBounds(
              coordinates[0] as [number, number],
              coordinates[0] as [number, number],
            ),
          );
          map.current!.fitBounds(bounds, {
            padding: 70,
            maxZoom: 8,
            duration: 900,
          });
          setState('ready');
        } else setState('empty');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('error');
      });
    return () => controller.abort();
  }, [from, ready, to, variable, vessels]);

  return (
    <div className="map-container">
      <div ref={container} className="map-canvas" />
      {state !== 'ready' && (
        <div className={`map-state ${state}`}>
          <strong>
            {state === 'loading'
              ? 'Loading voyage…'
              : state === 'empty'
                ? 'No trajectory selected'
                : 'Map data unavailable'}
          </strong>
          <span>
            {state === 'error'
              ? 'Check the API and try again.'
              : 'Historical positions are being prepared.'}
          </span>
        </div>
      )}
      <div className="map-counter">{pointCount} observations</div>
    </div>
  );
}
