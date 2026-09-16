import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const app = buildApp();

afterAll(async () => {
  await app.close();
});

describe('metadata API', () => {
  it('reports that the API and database are healthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      database: 'connected',
    });
  });
  it('returns vessel metadata', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vessels',
    });

    expect(response.statusCode).toBe(200);

    expect(response.json()).toEqual({
      data: [
        {
          id: 'IMO1',
          name: 'IMO1',
          availableFrom: '2026-03-01T00:15:00Z',
          availableTo: '2026-08-01T23:45:00Z',
          gpsObservationCount: 14779,
          motionObservationCount: 14778,
        },
        {
          id: 'IMO2',
          name: 'IMO2',
          availableFrom: '2026-03-01T00:15:00Z',
          availableTo: '2026-08-01T23:45:00Z',
          gpsObservationCount: 14436,
          motionObservationCount: 14436,
        },
        {
          id: 'IMO3',
          name: 'IMO3',
          availableFrom: '2026-03-01T00:15:00Z',
          availableTo: '2026-08-01T23:45:00Z',
          gpsObservationCount: 14235,
          motionObservationCount: 13546,
        },
      ],
    });
  });

  it('returns the supported variable catalogue', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/variables',
    });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      data: Array<{
        id: string;
        unit: string;
        category: string;
        supportsTrajectoryColour: boolean;
        supportsTimeSeries: boolean;
      }>;
    }>();

    expect(body.data).toHaveLength(28);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'sogKnots',
          unit: 'kn',
          category: 'navigation',
          supportsTrajectoryColour: true,
          supportsTimeSeries: true,
        }),
        expect.objectContaining({
          id: 'rollMotionDeg',
          unit: 'deg',
          category: 'motion',
          supportsTrajectoryColour: true,
          supportsTimeSeries: true,
        }),
      ]),
    );
  });

  it('rejects a trajectory request without required parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trajectories',
    });

    expect(response.statusCode).toBe(400);
  });

  it.each([
    [
      'an unknown vessel',
      'vessels=UNKNOWN&from=2026-03-01T00:15:00Z&to=2026-03-02T00:15:00Z',
      422,
    ],
    [
      'a duplicate vessel',
      'vessels=IMO1,IMO1&from=2026-03-01T00:15:00Z&to=2026-03-02T00:15:00Z',
      400,
    ],
    [
      'a malformed date',
      'vessels=IMO1&from=tomorrow&to=2026-03-02T00:15:00Z',
      400,
    ],
    [
      'an inverted date range',
      'vessels=IMO1&from=2026-03-02T00:15:00Z&to=2026-03-01T00:15:00Z',
      400,
    ],
    [
      'a range over 31 days',
      'vessels=IMO1&from=2026-03-01T00:15:00Z&to=2026-04-02T00:15:00Z',
      422,
    ],
    [
      'an unsupported variable',
      'vessels=IMO1&from=2026-03-01T00:15:00Z&to=2026-03-02T00:15:00Z&colourBy=unknown',
      422,
    ],
  ])('rejects %s', async (_label, query, expectedStatus) => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/trajectories?${query}`,
    });

    expect(response.statusCode).toBe(expectedStatus);
    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
  });

  it('returns a GeoJSON trajectory for a valid request', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/trajectories?vessels=IMO1&from=2026-03-01T00:15:00Z&to=2026-03-01T03:00:00Z&colourBy=sogKnots',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/geo+json');
    expect(response.json()).toMatchObject({
      type: 'FeatureCollection',
      metadata: {
        colourBy: 'sogKnots',
        gapThresholdMinutes: 30,
        downsampled: false,
      },
    });
    expect(response.json().features.length).toBeGreaterThan(0);
  });

  it('returns raw time series for selected vessels and variables', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/time-series?vessels=IMO1&variables=sogKnots,rollMotionDeg&from=2026-03-01T00:15:00Z&to=2026-03-01T03:00:00Z&resolution=raw',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      metadata: { resolution: 'raw', gapThresholdMinutes: 30 },
      data: [
        { vesselId: 'IMO1', variable: 'sogKnots', unit: 'kn' },
        { vesselId: 'IMO1', variable: 'rollMotionDeg', unit: 'deg' },
      ],
    });
  });
});
