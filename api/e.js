// Riceve gli eventi dal sito (navigator.sendBeacon, text/plain: niente preflight CORS).
import { sql, init } from '../lib/db.js';

const ALLOWED = ['pv', 'video_play', 'video_half', 'video_end', 'game_start', 'game_end', 'share', 'signup', 'click'];
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|monitor|curl|python|wget|playwright|puppeteer/i;
const cut = (s, n) => (typeof s === 'string' ? s.slice(0, n) : null);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (BOT.test(req.headers['user-agent'] || '')) return res.status(204).end();
  try {
    let b = req.body;
    if (typeof b === 'string') b = JSON.parse(b || '{}');
    if (!b || typeof b !== 'object') return res.status(204).end();
    const list = Array.isArray(b.ev) ? b.ev.slice(0, 20) : [b];
    const cc = cut(req.headers['x-vercel-ip-country'], 4);
    await init();
    for (const e of list) {
      if (!ALLOWED.includes(e.t)) continue;
      const v = Number.isFinite(+e.v) ? +e.v : null;
      await sql`INSERT INTO events (t,p,n,v,l,src,med,camp,ref,dev,cc,sid)
        VALUES (${e.t}, ${cut(e.p, 200)}, ${cut(e.n, 120)}, ${v}, ${cut(e.l, 40)},
                ${cut(b.src, 60)}, ${cut(b.med, 60)}, ${cut(b.camp, 80)}, ${cut(b.ref, 120)},
                ${cut(b.dev, 10)}, ${cc}, ${cut(b.sid, 40)})`;
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(204).end();
  }
}
