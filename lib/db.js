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
  await sql`CREATE TABLE IF NOT EXISTS game_tokens (
    tk TEXT PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    g TEXT NOT NULL, l TEXT, used BOOLEAN NOT NULL DEFAULT false
  )`;
  await sql`CREATE TABLE IF NOT EXISTS scores (
    id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    g TEXT NOT NULL, l TEXT, name TEXT NOT NULL, score INTEGER NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT false
  )`;
  await sql`CREATE INDEX IF NOT EXISTS scores_g_l_score ON scores (g, l, score DESC)`;
  ready = true;
}
