import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const sql = url ? neon(url) : null;

let ready = false;
export async function init() {
  if (!sql) throw new Error('DATABASE_URL mancante: collega il database Neon al progetto su Vercel');
  if (ready) return;
  await sql`CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    t TEXT NOT NULL,
    p TEXT, n TEXT, v REAL, l TEXT,
    src TEXT, med TEXT, camp TEXT, ref TEXT,
    dev TEXT, cc TEXT, sid TEXT
  )`;
  await sql`CREATE INDEX IF NOT EXISTS events_ts ON events (ts)`;
  await sql`CREATE INDEX IF NOT EXISTS events_t_ts ON events (t, ts)`;
  ready = true;
}
