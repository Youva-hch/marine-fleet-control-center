import { VARIABLE_CATALOG } from '../variables/catalog.js';

export interface TrajectoryQuery {
  vessels: string;
  from: string;
  to: string;
  colourBy?: string;
  maxPoints?: number;
}

interface ValidationIssue {
  status: 400 | 422;
  field: keyof TrajectoryQuery;
  code: string;
  detail: string;
}

const KNOWN_VESSELS = new Set(['IMO1', 'IMO2', 'IMO3']);
const KNOWN_VARIABLES = new Set(
  VARIABLE_CATALOG.map((variable) => variable.id),
);
const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function parseUtcTimestamp(value: string): Date | null {
  if (!UTC_TIMESTAMP.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateTrajectoryQuery(
  query: TrajectoryQuery,
): ValidationIssue | null {
  const vesselIds = query.vessels.split(',');

  if (vesselIds.length > 3) {
    return {
      status: 400,
      field: 'vessels',
      code: 'too_many_vessels',
      detail: "The 'vessels' parameter accepts at most three vessel IDs.",
    };
  }

  if (new Set(vesselIds).size !== vesselIds.length) {
    return {
      status: 400,
      field: 'vessels',
      code: 'duplicate_vessel',
      detail: "The 'vessels' parameter must contain unique vessel IDs.",
    };
  }

  if (vesselIds.some((vesselId) => !KNOWN_VESSELS.has(vesselId))) {
    return {
      status: 422,
      field: 'vessels',
      code: 'unsupported_vessel',
      detail: "The 'vessels' parameter contains an unknown vessel ID.",
    };
  }

  const from = parseUtcTimestamp(query.from);
  const to = parseUtcTimestamp(query.to);
  if (!from || !to) {
    return {
      status: 400,
      field: !from ? 'from' : 'to',
      code: 'invalid_utc_timestamp',
      detail: "The 'from' and 'to' parameters must be ISO 8601 UTC timestamps.",
    };
  }

  if (to <= from) {
    return {
      status: 400,
      field: 'to',
      code: 'after_from',
      detail: "The 'to' timestamp must be later than the 'from' timestamp.",
    };
  }

  const colourBy = query.colourBy ?? 'sogKnots';
  if (!KNOWN_VARIABLES.has(colourBy)) {
    return {
      status: 422,
      field: 'colourBy',
      code: 'unsupported_variable',
      detail: "The 'colourBy' parameter is not a supported variable.",
    };
  }

  return null;
}
