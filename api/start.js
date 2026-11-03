// Inizio partita: restituisce un gettone, serve per salvare il punteggio in classifica.
import { sql, init } from '../lib/db.js';
import { cors, body, GAMES } from '../lib/http.js';
import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();
  const b = body(req);
  const g = String(b.g || ''), l = String(b.l || '');
  if (!GAMES[g] || !GAMES[g].includes(l)) return res.status(400).json({ error: 'gioco' });
  try {
    await init();
    const tk = randomUUID();
    await sql`INSERT INTO game_tokens (tk, g, l) VALUES (${tk}, ${g}, ${l})`;
    if (Math.random() < 0.02) await sql`DELETE FROM game_tokens WHERE ts < now() - interval '2 days'`;
    res.status(200).json({ tk });
  } catch (e) { console.error(e); res.status(500).json({ error: 'db' }); }
}
