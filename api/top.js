// Classifica: miglior punteggio per persona, della settimana o di sempre.
import { sql, init } from '../lib/db.js';
import { cors, GAMES } from '../lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const g = String(req.query.g || 'autopostale'), l = String(req.query.l || 'medio');
  const p = req.query.p === 'all' ? 'all' : 'week';
  const n = Math.min(50, Math.max(1, parseInt(req.query.n || '10', 10) || 10));
  if (!GAMES[g] || !GAMES[g].includes(l)) return res.status(400).json({ error: 'gioco' });
  try {
    await init();
    const rows = p === 'all'
      ? await sql`SELECT name, MAX(score) AS score FROM scores WHERE g=${g} AND l=${l} AND NOT hidden
          GROUP BY name ORDER BY 2 DESC, MIN(ts) ASC LIMIT ${n}`
      : await sql`SELECT name, MAX(score) AS score FROM scores WHERE g=${g} AND l=${l} AND NOT hidden
          AND ts >= date_trunc('week', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich'
          GROUP BY name ORDER BY 2 DESC, MIN(ts) ASC LIMIT ${n}`;
    res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
    res.status(200).json({ g, l, p, top: rows.map(r => ({ name: r.name, score: Number(r.score) })) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'db' }); }
}
