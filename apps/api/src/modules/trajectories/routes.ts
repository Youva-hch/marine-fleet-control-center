import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import { VARIABLE_CATALOG } from '../variables/catalog.js';
import { buildFeatureCollection } from './geojson.js';
import { fetchTrajectoryPoints } from './query.js';
import { type TrajectoryQuery, validateTrajectoryQuery } from './validation.js';

const trajectoryQuerySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['vessels', 'from', 'to'],
  properties: {
    vessels: {
      type: 'string',
      minLength: 4,
    },
    from: {
      type: 'string',
      minLength: 1,
    },
    to: {
      type: 'string',
      minLength: 1,
    },
    colourBy: {
      type: 'string',
      default: 'sogKnots',
    },
    maxPoints: {
      type: 'integer',
      minimum: 100,
      maximum: 10000,
      default: 5000,
    },
  },
} as const;

export function registerTrajectoryRoutes(app: FastifyInstance) {
  app.get<{ Querystring: TrajectoryQuery }>(
    '/api/v1/trajectories',
    {
      schema: {
        querystring: trajectoryQuerySchema,
      },
    },
    async (request, reply) => {
      const issue = validateTrajectoryQuery(request.query);
      if (issue) {
        return reply
          .code(issue.status)
          .type('application/problem+json')
          .send({
            type: `https://fleet-control.example/problems/${issue.code}`,
            title: 'Invalid trajectory request',
            status: issue.status,
            detail: issue.detail,
            instance: request.url,
            errors: [{ field: issue.field, code: issue.code }],
          });
      }

      const vesselIds = request.query.vessels.split(',');
      const from = new Date(request.query.from);
      const to = new Date(request.query.to);
      const variable = request.query.colourBy ?? 'sogKnots';
      const maxPoints = request.query.maxPoints ?? 5000;
      const unit = VARIABLE_CATALOG.find((item) => item.id === variable)!.unit;
      const points = await fetchTrajectoryPoints(
        database,
        vesselIds,
        from,
        to,
        variable,
      );
      const { collection, downsampled } = buildFeatureCollection(
        points,
        variable,
        unit,
        maxPoints,
      );

      return reply.type('application/geo+json').send({
        ...collection,
        metadata: {
          from: request.query.from,
          to: request.query.to,
          colourBy: variable,
          gapThresholdMinutes: 30,
          downsampled,
        },
      });
    },
  );
}
