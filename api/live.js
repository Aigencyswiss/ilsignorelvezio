// Quante persone ci sono "in paese" adesso (visite negli ultimi 5 minuti). Solo un numero, niente dati personali.
import { sql, init } from '../lib/db.js';
import { cors } from '../lib/http.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    await init();
    const [r] = await sql`SELECT COUNT(DISTINCT sid)::int AS n FROM events WHERE t='pv' AND ts > now() - interval '5 minutes'`;
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ n: r.n });
  } catch (e) { console.error(e); res.status(200).json({ n: 0 }); }
}
