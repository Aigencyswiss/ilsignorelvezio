// Statistiche per la dashboard privata. Serve la password ADMIN_PASSWORD.
import { sql, init } from '../lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const pw = process.env.ADMIN_PASSWORD;
  const given = req.headers['x-admin'] || '';
  if (!pw || given !== pw) return res.status(401).json({ error: 'password' });
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '30', 10) || 30));
  try {
    await init();
    const [kpi] = await sql`SELECT
        COUNT(*) FILTER (WHERE t='pv') AS pv,
        COUNT(DISTINCT sid) FILTER (WHERE t='pv') AS visitors,
        COUNT(*) FILTER (WHERE t='video_play') AS video_play,
        COUNT(*) FILTER (WHERE t='video_end') AS video_end,
        COUNT(*) FILTER (WHERE t='game_start') AS game_start,
        COUNT(*) FILTER (WHERE t='game_end') AS game_end,
        COUNT(*) FILTER (WHERE t='share') AS share,
        COUNT(*) FILTER (WHERE t='signup') AS signup
      FROM events WHERE ts > now() - make_interval(days => ${days})`;
    const daily = await sql`SELECT to_char(date_trunc('day', ts AT TIME ZONE 'Europe/Zurich'),'YYYY-MM-DD') AS d,
        COUNT(*) FILTER (WHERE t='pv') AS pv,
        COUNT(DISTINCT sid) FILTER (WHERE t='pv') AS visitors,
        COUNT(*) FILTER (WHERE t='game_start') AS games,
        COUNT(*) FILTER (WHERE t='video_play') AS videos
      FROM events WHERE ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 1`;
    const sources = await sql`SELECT COALESCE(src,'diretto') AS k, COUNT(DISTINCT sid) AS visitors, COUNT(*) AS pv
      FROM events WHERE t='pv' AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC LIMIT 12`;
    const pages = await sql`SELECT p AS k, COUNT(*) AS pv, COUNT(DISTINCT sid) AS visitors
      FROM events WHERE t='pv' AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC LIMIT 15`;
    const videos = await sql`SELECT n AS k,
        COUNT(*) FILTER (WHERE t='video_play') AS play,
        COUNT(*) FILTER (WHERE t='video_half') AS half,
        COUNT(*) FILTER (WHERE t='video_end') AS fine
      FROM events WHERE t LIKE 'video_%' AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC LIMIT 15`;
    const games = await sql`SELECT n AS k, l AS lvl,
        COUNT(*) FILTER (WHERE t='game_start') AS start,
        COUNT(*) FILTER (WHERE t='game_end') AS fine,
        ROUND(AVG(v) FILTER (WHERE t='game_end')::numeric, 1) AS media,
        MAX(v) FILTER (WHERE t='game_end') AS record,
        COUNT(DISTINCT sid) FILTER (WHERE t='game_start') AS giocatori
      FROM events WHERE t IN ('game_start','game_end') AND ts > now() - make_interval(days => ${days}) GROUP BY 1,2 ORDER BY 3 DESC`;
    const shares = await sql`SELECT n AS k, COUNT(*) AS c FROM events WHERE t='share' AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC`;
    const signups = await sql`SELECT COALESCE(n,'newsletter') AS k, COUNT(*) AS c FROM events WHERE t='signup' AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC`;
    const devices = await sql`SELECT COALESCE(dev,'?') AS k, COUNT(DISTINCT sid) AS c FROM events WHERE t='pv' AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC`;
    const countries = await sql`SELECT COALESCE(cc,'?') AS k, COUNT(DISTINCT sid) AS c FROM events WHERE t='pv' AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC LIMIT 8`;
    const campaigns = await sql`SELECT camp AS k, COUNT(DISTINCT sid) AS c FROM events WHERE t='pv' AND camp IS NOT NULL AND ts > now() - make_interval(days => ${days}) GROUP BY 1 ORDER BY 2 DESC LIMIT 10`;
    const leads = await sql`SELECT to_char(ts AT TIME ZONE 'Europe/Zurich','DD.MM.YYYY HH24:MI') AS d, nome, cognome, email, attivita, telefono, pacchetto, offerta, marketing
      FROM leads ORDER BY ts DESC LIMIT 100`;
    res.status(200).json({ days, leads, kpi, daily, sources, pages, videos, games, shares, signups, devices, countries, campaigns, at: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
