import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'csv-parse';
import pg from 'pg';

import {
  MOTION_COLUMNS,
  normaliseMotion,
  normalisePosition,
  type CsvRecord,
} from './normalise.js';

const { Client } = pg;
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://fleet:fleet@localhost:5432/fleet_control';
const dataDirectory = fileURLToPath(
  new URL('../../../data/raw/', import.meta.url),
);
const batchSize = 500;

interface ImportSummary {
  file: string;
  rows: number;
  rowsWithFlags: number;
}

async function readRecords(file: string): Promise<CsvRecord[]> {
  const parser = createReadStream(resolve(dataDirectory, file)).pipe(
    parse({ columns: true, bom: true, skip_empty_lines: true, trim: true }),
  );
  const result: CsvRecord[] = [];
  for await (const record of parser) result.push(record as CsvRecord);
  return result;
}

async function findVesselId(
  client: pg.Client,
  imoCode: string,
): Promise<number> {
  const result = await client.query<{ id: number }>(
    'SELECT id FROM vessels WHERE imo_code = $1',
    [imoCode],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error(`Unknown vessel: ${imoCode}`);
  return id;
}

async function importPositions(
  client: pg.Client,
  file: string,
  imoCode: string,
): Promise<ImportSummary> {
  const vesselId = await findVesselId(client, imoCode);
  const sourceRows = await readRecords(file);
  let rowsWithFlags = 0;

  for (let start = 0; start < sourceRows.length; start += batchSize) {
    const batch = sourceRows
      .slice(start, start + batchSize)
      .map(normalisePosition);
    const values: unknown[] = [];
    const sqlRows = batch.map((row, index) => {
      if (row.qualityFlags.length > 0) rowsWithFlags += 1;
      values.push(
        vesselId,
        row.observedAt,
        row.longitude,
        row.latitude,
        row.courseDeg,
        row.headingDeg,
        row.sogKnots,
        row.qualityFlags,
      );
      const offset = index * 8;
      return `($${offset + 1}, $${offset + 2}, CASE WHEN $${offset + 3}::double precision IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($${offset + 3}, $${offset + 4}), 4326)::geography END, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
    });

    await client.query(
      `INSERT INTO vessel_positions
        (vessel_id, observed_at, position, course_deg, heading_deg, sog_knots, quality_flags)
       VALUES ${sqlRows.join(',')}
       ON CONFLICT (vessel_id, observed_at) DO UPDATE SET
         position = EXCLUDED.position,
         course_deg = EXCLUDED.course_deg,
         heading_deg = EXCLUDED.heading_deg,
         sog_knots = EXCLUDED.sog_knots,
         quality_flags = EXCLUDED.quality_flags`,
      values,
    );
  }

  return { file, rows: sourceRows.length, rowsWithFlags };
}

async function importMotions(
  client: pg.Client,
  file: string,
  imoCode: string,
): Promise<ImportSummary> {
  const vesselId = await findVesselId(client, imoCode);
  const sourceRows = await readRecords(file);
  const databaseColumns = MOTION_COLUMNS.map(([, target]) => target);
  const columnCount = databaseColumns.length + 3;
  let rowsWithFlags = 0;

  for (let start = 0; start < sourceRows.length; start += batchSize) {
    const batch = sourceRows
      .slice(start, start + batchSize)
      .map(normaliseMotion);
    const values: unknown[] = [];
    const sqlRows = batch.map((row, index) => {
      if (row.qualityFlags.length > 0) rowsWithFlags += 1;
      values.push(vesselId, row.observedAt, ...row.values, row.qualityFlags);
      const offset = index * columnCount;
      return `(${Array.from({ length: columnCount }, (_, column) => `$${offset + column + 1}`).join(',')})`;
    });
    const updates = [...databaseColumns, 'quality_flags'].map(
      (column) => `${column} = EXCLUDED.${column}`,
    );

    await client.query(
      `INSERT INTO vessel_motions
        (vessel_id, observed_at, ${databaseColumns.join(',')}, quality_flags)
       VALUES ${sqlRows.join(',')}
       ON CONFLICT (vessel_id, observed_at) DO UPDATE SET ${updates.join(',')}`,
      values,
    );
  }

  return { file, rows: sourceRows.length, rowsWithFlags };
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    const summaries: ImportSummary[] = [];
    for (const imoCode of ['IMO1', 'IMO2', 'IMO3']) {
      summaries.push(
        await importPositions(client, `${imoCode}_GPS.csv`, imoCode),
      );
      summaries.push(
        await importMotions(client, `${imoCode}_MOTIONS.csv`, imoCode),
      );
    }
    await client.query('COMMIT');
    console.table(summaries);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

await main();
