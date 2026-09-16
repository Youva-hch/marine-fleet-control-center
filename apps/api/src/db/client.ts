import pg from 'pg';

const { Pool } = pg;

export const database = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://fleet:fleet@localhost:5432/fleet_control',
});
