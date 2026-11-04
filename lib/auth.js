// Account dei giocatori: password cifrate (scrypt), sessioni con cookie, codici via email.
import crypto from 'crypto';
import { sql } from './db.js';

export const COOKIE = 'elv_s';
const DAYS = 180;

export function hashPass(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('hex') + '$' + h.toString('hex');
}
export function checkPass(pw, stored) {
  const [k, s, h] = String(stored || '').split('$');
  if (k !== 'scrypt' || !s || !h) return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 32, { N: 16384, r: 8, p: 1 });
  const b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
export const newCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

export function cookies(req) {
  const out = {};
  String(req.headers?.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
export function setSession(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=${DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`);
}
export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
}
export async function createSession(res, userId, ua) {
  const token = crypto.randomBytes(32).toString('base64url');
  await sql`INSERT INTO sessions (th, user_id, ua) VALUES (${sha(token)}, ${userId}, ${String(ua || '').slice(0, 160)})`;
  await sql`UPDATE users SET last_login = now() WHERE id = ${userId}`;
  setSession(res, token);
}
// Restituisce il giocatore collegato, oppure null.
export async function currentUser(req) {
  const t = cookies(req)[COOKIE];
  if (!t) return null;
  const rows = await sql`SELECT u.id, u.email, u.nick, u.news, u.verified, u.ts FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.th = ${sha(t)} AND s.ts > now() - interval '180 days'`;
  if (!rows.length) return null;
  if (Math.random() < 0.1) await sql`UPDATE sessions SET seen = now() WHERE th = ${sha(t)}`;
  return rows[0];
}

// Email con Resend (chiave in RESEND_API_KEY, mittente in MAIL_FROM)
export async function sendMail(to, subject, html, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('mail');
  const from = process.env.MAIL_FROM || 'Il Signor Elvezio <elvezio@aigencyswiss.com>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, text })
  });
  if (!r.ok) { console.error('resend', r.status, await r.text()); throw new Error('mail'); }
}
export function codeMail(code, kind) {
  const what = kind === 'reset' ? 'per scegliere una nuova password' : 'per confermare la tua email ed entrare nel parco giochi';
  const text = `Ciao!\n\nEcco il tuo codice ${what}: ${code}\n\nVale 15 minuti. Se non sei stato tu, ignora questa email: senza il codice nessuno entra.\n\nIl Signor Elvezio\nhttps://ilsignorelvezio.vercel.app/parco/`;
  const html = `<div style="font-family:Arial,sans-serif;background:#F1E6CF;padding:28px"><div style="max-width:480px;margin:0 auto;background:#FBF5E8;border:1px solid #DCC9A4;border-radius:18px;padding:28px;color:#2A1A12">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#E83B2B;font-weight:bold">Il parco giochi di Elvezio</p>
<h1 style="margin:0 0 14px;font-family:Georgia,serif;color:#5C1F2B;font-size:26px">Ecco il tuo codice</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.5">Scrivilo nel parco giochi ${what}.</p>
<p style="margin:0 0 18px;font-size:38px;font-weight:bold;letter-spacing:10px;color:#3E1019;background:#fff;border:2px dashed #C9962E;border-radius:12px;padding:14px;text-align:center">${code}</p>
<p style="margin:0 0 8px;font-size:14px;color:#6B4A32">Vale 15 minuti. Se non sei stato tu, ignora questa email: senza il codice nessuno entra.</p>
<p style="margin:18px 0 0;font-size:15px">Il Signor Elvezio<br><span style="color:#6B4A32">Da Corippo al mondo, con calma.</span></p></div></div>`;
  return { subject: kind === 'reset' ? `${code} – il codice per la nuova password` : `${code} – il tuo codice per il parco giochi`, html, text };
}
export const ipOf = req => String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 64) || null;
