// Salva il punteggio in classifica. Controlla gettone, tempo di gioco e nome Instagram.
import { sql, init } from '../lib/db.js';
import { cors, body, MAXSCORE, LOGIN_GAMES } from '../lib/http.js';
import { currentUser } from '../lib/auth.js';

const BAD = /(cazz|stronz|vaffan|puttan|merda|troia|coglion|fuck|shit|bitch|nazi|hitler|porco.?dio|negr)/i;

export default async function handler(req, res) {
  if (cors(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const b = body(req);
  let name = String(b.name || '').trim().replace(/^@+/, '').toLowerCase();
  const score = Math.floor(Number(b.score));
  if (!Number.isFinite(score) || score < 1 || score > 200000) return res.status(400).json({ error: 'punteggio' });
  try {
    await init();
    // nel parco giochi si gioca con l'account: il nome in classifica è quello del profilo
    const user = await currentUser(req);
    if (user) name = user.nick;
    else if (LOGIN_GAMES.includes(String(b.g || '')) ) return res.status(401).json({ error: 'login' });
    if (!/^[a-z0-9._]{1,30}$/.test(name) || BAD.test(name)) return res.status(400).json({ error: 'nome' });
    const rows = await sql`UPDATE game_tokens SET used = true
      WHERE tk = ${String(b.tk || '')} AND used = false AND ts > now() - interval '3 hours'
      RETURNING g, l, EXTRACT(EPOCH FROM (now() - ts)) AS secs`;
    if (!rows.length) return res.status(400).json({ error: 'gettone' });
    const { g, l, secs } = rows[0];
    if (score > (MAXSCORE[g] || MAXSCORE.autopostale)(Number(secs))) return res.status(400).json({ error: 'troppo' });
    if (LOGIN_GAMES.includes(g) && !user) return res.status(401).json({ error: 'login' });
    await sql`INSERT INTO scores (g, l, name, score, user_id) VALUES (${g}, ${l}, ${name}, ${score}, ${user ? user.id : null})`;
    const [w] = await sql`SELECT COUNT(*)::int + 1 AS r FROM (
        SELECT name, MAX(score) AS s FROM scores WHERE g=${g} AND l=${l} AND NOT hidden
          AND ts >= date_trunc('week', now() AT TIME ZONE 'Europe/Zurich') AT TIME ZONE 'Europe/Zurich'
        GROUP BY name) x WHERE x.s > ${score}`;
    const [a] = await sql`SELECT COUNT(*)::int + 1 AS r FROM (
        SELECT name, MAX(score) AS s FROM scores WHERE g=${g} AND l=${l} AND NOT hidden GROUP BY name) x WHERE x.s > ${score}`;
    res.status(200).json({ ok: true, g, l, rankWeek: w.r, rankAll: a.r });
  } catch (e) { console.error(e); res.status(500).json({ error: 'db' }); }
}
