import Fastify from 'fastify';

import { database } from './db/client.js';
import { registerTimeSeriesRoutes } from './modules/time-series/routes.js';
import { registerTrajectoryRoutes } from './modules/trajectories/routes.js';
import { registerVariableRoutes } from './modules/variables/routes.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get('/api/v1/health', async (_request, reply) => {
    try {
      await database.query('SELECT 1');

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error) {
      app.log.error(error);

      return reply.code(503).send({
        status: 'error',
        database: 'unavailable',
      });
    }
  });
  app.get('/api/v1/vessels', async () => {
    const result = await database.query<{
      id: string;
      name: string;
      available_from: Date;
      available_to: Date;
      gps_observation_count: number;
      motion_observation_count: number;
    }>(`
      SELECT
        v.imo_code AS id,
        v.display_name AS name,
        MIN(p.observed_at) AS available_from,
        MAX(p.observed_at) AS available_to,
        COUNT(p.observed_at)::integer AS gps_observation_count,
        (
          SELECT COUNT(*)::integer
          FROM vessel_motions m
          WHERE m.vessel_id = v.id
        ) AS motion_observation_count
      FROM vessels v
      JOIN vessel_positions p ON p.vessel_id = v.id
      GROUP BY v.id
      ORDER BY v.id
    `);

    return {
      data: result.rows.map((vessel) => ({
        id: vessel.id,
        name: vessel.name,
        availableFrom: vessel.available_from
          .toISOString()
          .replace('.000Z', 'Z'),
        availableTo: vessel.available_to.toISOString().replace('.000Z', 'Z'),
        gpsObservationCount: vessel.gps_observation_count,
        motionObservationCount: vessel.motion_observation_count,
      })),
    };
  });

  registerVariableRoutes(app);
  registerTrajectoryRoutes(app);
  registerTimeSeriesRoutes(app);

  app.addHook('onClose', async () => {
    await database.end();
  });

  return app;
}
