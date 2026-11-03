// Salva il punteggio in classifica. Controlla gettone, tempo di gioco e nome Instagram.
import { sql, init } from '../lib/db.js';
import { cors, body } from '../lib/http.js';

const BAD = /(cazz|stronz|vaffan|puttan|merda|troia|coglion|fuck|shit|bitch|nazi|hitler|porco.?dio|negr)/i;
const MPS = 35; // metri al secondo massimi credibili (velocità massima + bonus)

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();
  const b = body(req);
  const name = String(b.name || '').trim().replace(/^@+/, '').toLowerCase();
  const score = Math.floor(Number(b.score));
  if (!/^[a-z0-9._]{1,30}$/.test(name) || BAD.test(name)) return res.status(400).json({ error: 'nome' });
  if (!Number.isFinite(score) || score < 1 || score > 200000) return res.status(400).json({ error: 'punteggio' });
  try {
    await init();
    const rows = await sql`UPDATE game_tokens SET used = true
      WHERE tk = ${String(b.tk || '')} AND used = false AND ts > now() - interval '3 hours'
      RETURNING g, l, EXTRACT(EPOCH FROM (now() - ts)) AS secs`;
    if (!rows.length) return res.status(400).json({ error: 'gettone' });
    const { g, l, secs } = rows[0];
    if (score > Number(secs) * MPS + 120) return res.status(400).json({ error: 'troppo' });
    await sql`INSERT INTO scores (g, l, name, score) VALUES (${g}, ${l}, ${name}, ${score})`;
    const [w] = await sql`SELECT COUNT(*)::int + 1 AS r FROM (
        SELECT name, MAX(score) AS s FROM scores WHERE g=${g} AND l=${l} AND NOT hidden
          AND ts >= date_trunc('week', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich'
        GROUP BY name) x WHERE x.s > ${score}`;
    const [a] = await sql`SELECT COUNT(*)::int + 1 AS r FROM (
        SELECT name, MAX(score) AS s FROM scores WHERE g=${g} AND l=${l} AND NOT hidden GROUP BY name) x WHERE x.s > ${score}`;
    res.status(200).json({ ok: true, g, l, rankWeek: w.r, rankAll: a.r });
  } catch (e) { console.error(e); res.status(500).json({ error: 'db' }); }
}
