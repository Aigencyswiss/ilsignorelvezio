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
  await sql`ALTER TABLE scores ADD COLUMN IF NOT EXISTS user_id INTEGER`;
  // account dei giocatori del parco giochi
  await sql`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    email TEXT NOT NULL UNIQUE, nick TEXT NOT NULL UNIQUE, pass TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false, news BOOLEAN NOT NULL DEFAULT false,
    last_login TIMESTAMPTZ
  )`;
  await sql`CREATE TABLE IF NOT EXISTS sessions (
    th TEXT PRIMARY KEY, user_id INTEGER NOT NULL, ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen TIMESTAMPTZ NOT NULL DEFAULT now(), ua TEXT
  )`;
  await sql`CREATE TABLE IF NOT EXISTS codes (
    id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    email TEXT NOT NULL, kind TEXT NOT NULL, ch TEXT NOT NULL, tries INTEGER NOT NULL DEFAULT 0, used BOOLEAN NOT NULL DEFAULT false
  )`;
  await sql`CREATE TABLE IF NOT EXISTS auth_log (
    id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT now(), email TEXT, ip TEXT, kind TEXT NOT NULL
  )`;
  // richieste di collaborazione (pagina /collabora)
  await sql`CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT now(),
    nome TEXT NOT NULL, cognome TEXT NOT NULL, email TEXT NOT NULL,
    attivita TEXT, telefono TEXT, pacchetto TEXT NOT NULL, offerta TEXT,
    nota TEXT, marketing BOOLEAN NOT NULL DEFAULT false, ip TEXT
  )`;
  ready = true;
}
