// Login del parco giochi: registrazione, conferma email, accesso, password dimenticata, uscita.
// Un solo endpoint con il campo "a" (azione), così restiamo nel limite di funzioni di Vercel.
import { sql, init } from '../lib/db.js';
import { body } from '../lib/http.js';
import { hashPass, checkPass, sha, newCode, createSession, currentUser, clearSession, sendMail, codeMail, cookies, COOKIE, ipOf } from '../lib/auth.js';

const BAD = /(cazz|stronz|vaffan|puttan|merda|troia|coglion|fuck|shit|bitch|nazi|hitler|porco.?dio|negr|admin|elvezio)/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const NICK = /^[a-z0-9._]{3,24}$/;

async function log(kind, email, ip) { await sql`INSERT INTO auth_log (kind, email, ip) VALUES (${kind}, ${email}, ${ip})`; }
async function count(kind, field, val, minutes) {
  const iv = minutes + ' minutes';
  const r = field === 'email'
    ? await sql`SELECT COUNT(*)::int AS n FROM auth_log WHERE kind = ${kind} AND email = ${val} AND ts > now() - ${iv}::interval`
    : await sql`SELECT COUNT(*)::int AS n FROM auth_log WHERE kind = ${kind} AND ip = ${val} AND ts > now() - ${iv}::interval`;
  return r[0].n;
}
// Manda un codice (conferma o nuova password), con limiti contro gli abusi.
async function sendCode(email, kind, ip) {
  if (await count('code', 'email', email, 60) >= 4) return 'troppi';
  if (ip && await count('code', 'ip', ip, 60) >= 25) return 'troppi';
  const code = newCode();
  await sql`UPDATE codes SET used = true WHERE email = ${email} AND kind = ${kind} AND used = false`;
  await sql`INSERT INTO codes (email, kind, ch) VALUES (${email}, ${kind}, ${sha(code + email)})`;
  await log('code', email, ip);
  const m = codeMail(code, kind);
  await sendMail(email, m.subject, m.html, m.text);
  return 'ok';
}
async function useCode(email, kind, code) {
  const rows = await sql`SELECT id, ch, tries FROM codes WHERE email = ${email} AND kind = ${kind} AND used = false
    AND ts > now() - interval '15 minutes' ORDER BY id DESC LIMIT 1`;
  if (!rows.length) return 'scaduto';
  const c = rows[0];
  if (c.tries >= 5) return 'scaduto';
  if (c.ch !== sha(String(code).trim() + email)) { await sql`UPDATE codes SET tries = tries + 1 WHERE id = ${c.id}`; return 'sbagliato'; }
  await sql`UPDATE codes SET used = true WHERE id = ${c.id}`;
  return 'ok';
}
const pub = u => ({ nick: u.nick, email: u.email, news: !!u.news, since: u.ts });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await init();
    if (req.method === 'GET') {
      const u = await currentUser(req);
      return res.status(200).json({ user: u ? pub(u) : null, ready: !!process.env.RESEND_API_KEY });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = body(req), a = String(b.a || ''), ip = ipOf(req), ua = req.headers?.['user-agent'];
    const email = String(b.email || '').trim().toLowerCase();
    const pw = String(b.password || '');

    if (a === 'register') {
      const nick = String(b.nick || '').trim().replace(/^@+/, '').toLowerCase();
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'email' });
      if (pw.length < 8 || pw.length > 200) return res.status(400).json({ error: 'password' });
      if (!NICK.test(nick) || BAD.test(nick)) return res.status(400).json({ error: 'nick' });
      if (ip && await count('register', 'ip', ip, 60) >= 10) return res.status(429).json({ error: 'troppi' });
      const ex = await sql`SELECT id, verified, nick FROM users WHERE email = ${email}`;
      if (ex.length && ex[0].verified) return res.status(409).json({ error: 'esiste' });
      const nn = await sql`SELECT id FROM users WHERE nick = ${nick} AND email <> ${email}`;
      if (nn.length) return res.status(409).json({ error: 'nick_preso' });
      await log('register', email, ip);
      if (ex.length) await sql`UPDATE users SET nick = ${nick}, pass = ${hashPass(pw)}, news = ${!!b.news} WHERE id = ${ex[0].id}`;
      else await sql`INSERT INTO users (email, nick, pass, news) VALUES (${email}, ${nick}, ${hashPass(pw)}, ${!!b.news})`;
      const s = await sendCode(email, 'verify', ip);
      if (s !== 'ok') return res.status(429).json({ error: s });
      return res.status(200).json({ ok: true, step: 'verify' });
    }

    if (a === 'verify') {
      const r = await useCode(email, 'verify', b.code);
      if (r !== 'ok') return res.status(400).json({ error: r });
      const u = await sql`UPDATE users SET verified = true WHERE email = ${email} RETURNING id, email, nick, news, ts`;
      if (!u.length) return res.status(400).json({ error: 'scaduto' });
      await createSession(res, u[0].id, ua);
      return res.status(200).json({ ok: true, user: pub(u[0]) });
    }

    if (a === 'login') {
      if (!EMAIL.test(email) || !pw) return res.status(400).json({ error: 'dati' });
      if (await count('fail', 'email', email, 15) >= 8 || (ip && await count('fail', 'ip', ip, 15) >= 30)) return res.status(429).json({ error: 'bloccato' });
      const rows = await sql`SELECT id, email, nick, news, ts, pass, verified FROM users WHERE email = ${email}`;
      if (!rows.length || !checkPass(pw, rows[0].pass)) { await log('fail', email, ip); return res.status(401).json({ error: 'credenziali' }); }
      if (!rows[0].verified) {
        const s = await sendCode(email, 'verify', ip);
        return res.status(200).json({ ok: true, step: 'verify', sent: s === 'ok' });
      }
      await createSession(res, rows[0].id, ua);
      return res.status(200).json({ ok: true, user: pub(rows[0]) });
    }

    if (a === 'resend') {
      const rows = await sql`SELECT verified FROM users WHERE email = ${email}`;
      if (rows.length && !rows[0].verified) { const s = await sendCode(email, 'verify', ip); if (s !== 'ok') return res.status(429).json({ error: s }); }
      return res.status(200).json({ ok: true });
    }

    if (a === 'forgot') {
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'email' });
      const rows = await sql`SELECT id FROM users WHERE email = ${email}`;
      // risponde sempre ok: così non si scopre chi ha un account
      if (rows.length) { const s = await sendCode(email, 'reset', ip); if (s !== 'ok') return res.status(429).json({ error: s }); }
      return res.status(200).json({ ok: true, step: 'reset' });
    }

    if (a === 'reset') {
      if (pw.length < 8 || pw.length > 200) return res.status(400).json({ error: 'password' });
      const r = await useCode(email, 'reset', b.code);
      if (r !== 'ok') return res.status(400).json({ error: r });
      const u = await sql`UPDATE users SET pass = ${hashPass(pw)}, verified = true WHERE email = ${email} RETURNING id, email, nick, news, ts`;
      if (!u.length) return res.status(400).json({ error: 'scaduto' });
      await sql`DELETE FROM sessions WHERE user_id = ${u[0].id}`;
      await createSession(res, u[0].id, ua);
      return res.status(200).json({ ok: true, user: pub(u[0]) });
    }

    if (a === 'logout' || a === 'logout_all') {
      const t = cookies(req)[COOKIE];
      if (t) {
        if (a === 'logout_all') { const u = await currentUser(req); if (u) await sql`DELETE FROM sessions WHERE user_id = ${u.id}`; }
        else await sql`DELETE FROM sessions WHERE th = ${sha(t)}`;
      }
      clearSession(res);
      return res.status(200).json({ ok: true });
    }

    if (a === 'news') {
      const u = await currentUser(req);
      if (!u) return res.status(401).json({ error: 'login' });
      await sql`UPDATE users SET news = ${!!b.news} WHERE id = ${u.id}`;
      return res.status(200).json({ ok: true, news: !!b.news });
    }

    return res.status(400).json({ error: 'azione' });
  } catch (e) {
    if (e && e.message === 'mail') return res.status(503).json({ error: 'mail' });
    console.error(e); return res.status(500).json({ error: 'db' });
  }
}
