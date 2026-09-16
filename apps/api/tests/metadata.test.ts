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
});
