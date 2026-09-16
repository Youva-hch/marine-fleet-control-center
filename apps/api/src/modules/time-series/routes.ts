import type { FastifyInstance } from 'fastify';

import { database } from '../../db/client.js';
import { VARIABLE_CATALOG } from '../variables/catalog.js';
import {
  aggregateSeries,
  resolveAutoResolution,
  type Resolution,
} from './aggregation.js';
import { fetchSeries } from './query.js';

interface TimeSeriesQuery {
  vessels: string;
  variables: string;
  from: string;
  to: string;
  resolution?: Resolution | 'auto';
}

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['vessels', 'variables', 'from', 'to'],
  properties: {
    vessels: { type: 'string', minLength: 4 },
    variables: { type: 'string', minLength: 1 },
    from: { type: 'string', minLength: 1 },
    to: { type: 'string', minLength: 1 },
    resolution: {
      type: 'string',
      enum: ['raw', '1h', '6h', '1d', 'auto'],
      default: 'auto',
    },
  },
} as const;

const knownVessels = new Set(['IMO1', 'IMO2', 'IMO3']);
const variableById = new Map(
  VARIABLE_CATALOG.map((variable) => [variable.id, variable]),
);

export function registerTimeSeriesRoutes(app: FastifyInstance) {
  app.get<{ Querystring: TimeSeriesQuery }>(
    '/api/v1/time-series',
    { schema: { querystring: schema } },
    async (request, reply) => {
      const vessels = request.query.vessels.split(',');
      const variables = request.query.variables.split(',');
      const from = new Date(request.query.from);
      const to = new Date(request.query.to);
      const invalid =
        vessels.length > 3 ||
        new Set(vessels).size !== vessels.length ||
        vessels.some((vessel) => !knownVessels.has(vessel)) ||
        variables.length > 5 ||
        new Set(variables).size !== variables.length ||
        variables.some((variable) => !variableById.has(variable)) ||
        Number.isNaN(from.getTime()) ||
        Number.isNaN(to.getTime()) ||
        to <= from;

      if (invalid) {
        return reply.code(400).type('application/problem+json').send({
          type: 'https://fleet-control.example/problems/invalid-time-series-request',
          title: 'Invalid time-series request',
          status: 400,
          detail: 'Check vessel IDs, variables, timestamps and request limits.',
          instance: request.url,
        });
      }

      const requestedResolution = request.query.resolution ?? 'auto';
      const resolution =
        requestedResolution === 'auto'
          ? resolveAutoResolution(from, to)
          : requestedResolution;
      if (
        resolution === 'raw' &&
        to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000
      ) {
        return reply.code(422).type('application/problem+json').send({
          type: 'https://fleet-control.example/problems/raw-range-too-large',
          title: 'Raw range too large',
          status: 422,
          detail: 'Raw time-series requests may cover at most 31 days.',
          instance: request.url,
        });
      }

      const data = [];
      for (const vesselId of vessels) {
        for (const variable of variables) {
          const metadata = variableById.get(variable)!;
          const points = await fetchSeries(
            database,
            vesselId,
            variable,
            from,
            to,
          );
          data.push({
            vesselId,
            variable,
            unit: metadata.unit,
            points: aggregateSeries(
              points,
              resolution,
              variable === 'courseDeg' || variable === 'headingDeg',
            ),
          });
        }
      }

      return {
        data,
        metadata: {
          from: request.query.from,
          to: request.query.to,
          resolution,
          gapThresholdMinutes: 30,
        },
      };
    },
  );
}
