import type { FastifyInstance } from 'fastify';

import { VARIABLE_CATALOG } from './catalog.js';

export function registerVariableRoutes(app: FastifyInstance) {
  app.get('/api/v1/variables', async () => ({
    data: VARIABLE_CATALOG,
  }));
}
