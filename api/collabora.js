// Conferma di un'offerta di collaborazione dalla pagina /collabora.
// Salva la richiesta, avvisa Michel (NOTIFY_EMAIL) e manda una conferma al cliente.
import { sql, init } from '../lib/db.js';
import { body } from '../lib/http.js';
import { sendMail, ipOf } from '../lib/auth.js';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const PACCHETTI = { reel: 'Reel – 180 fr', reel_storie: 'Reel + storie – 250 fr' };
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'metodo' });
  const b = body(req);
  if (b.sito) return res.status(200).json({ ok: true }); // campo trappola per i bot
  const d = {
    nome: clip(b.nome, 60), cognome: clip(b.cognome, 60), email: clip(b.email, 200).toLowerCase(),
    attivita: clip(b.attivita, 120), telefono: clip(b.telefono, 40), pacchetto: clip(b.pacchetto, 20),
    offerta: clip(b.offerta, 40), nota: clip(b.nota, 1000), marketing: b.marketing === true, termini: b.termini === true
  };
  if (!d.nome || !d.cognome) return res.status(400).json({ error: 'nome' });
  if (!EMAIL.test(d.email)) return res.status(400).json({ error: 'email' });
  if (!PACCHETTI[d.pacchetto]) return res.status(400).json({ error: 'pacchetto' });
  if (!d.termini) return res.status(400).json({ error: 'termini' });
  const ip = ipOf(req);
  try {
    await init();
    if (ip) {
      const [r] = await sql`SELECT COUNT(*)::int AS n FROM leads WHERE ip = ${ip} AND ts > now() - interval '1 hour'`;
      if (r.n >= 5) return res.status(429).json({ error: 'troppi' });
    }
    await sql`INSERT INTO leads (nome, cognome, email, attivita, telefono, pacchetto, offerta, nota, marketing, ip)
      VALUES (${d.nome}, ${d.cognome}, ${d.email}, ${d.attivita || null}, ${d.telefono || null}, ${d.pacchetto},
              ${d.offerta || null}, ${d.nota || null}, ${d.marketing}, ${ip})`;
  } catch (err) {
    console.error('collabora', err);
    return res.status(500).json({ error: 'server' });
  }
  const pac = PACCHETTI[d.pacchetto];
  // Avviso a Michel e conferma al cliente: se l'email non parte, la richiesta resta comunque salvata.
  const to = process.env.NOTIFY_EMAIL;
  if (to) {
    const rows = [['Nome', d.nome + ' ' + d.cognome], ['Attività', d.attivita], ['Email', d.email], ['Telefono', d.telefono],
      ['Pacchetto', pac], ['Offerta', d.offerta], ['Nota', d.nota], ['Newsletter e marketing', d.marketing ? 'sì' : 'no']];
    const text = 'Nuova conferma di collaborazione\n\n' + rows.map(r => r[0] + ': ' + (r[1] || '–')).join('\n');
    const html = '<h2 style="font-family:Georgia,serif;color:#3E1019">Nuova conferma di collaborazione</h2><table style="font-family:Arial,sans-serif;font-size:15px">'
      + rows.map(r => `<tr><td style="padding:4px 14px 4px 0;color:#6B4A4F">${r[0]}</td><td style="padding:4px 0"><b>${esc(r[1] || '–')}</b></td></tr>`).join('') + '</table>';
    try { await sendMail(to, `Collaborazione confermata: ${d.attivita || d.nome + ' ' + d.cognome} (${pac})`, html, text); } catch {}
  }
  try {
    const text = `Ciao ${d.nome},\n\ngrazie! Abbiamo ricevuto la tua conferma per il pacchetto "${pac}".\n\nTi scriviamo noi nei prossimi giorni per l'acconto del 50% e per fissare il giorno delle riprese. Il saldo si paga alla pubblicazione del reel.\n\nA presto!\nIl Signor Elvezio\nhttps://www.instagram.com/ilsignorelvezio/`;
    const html = `<div style="font-family:Arial,sans-serif;background:#F6EFE4;padding:28px"><div style="max-width:500px;margin:0 auto;background:#fff;border:1px solid #E6D6C3;border-radius:18px;padding:28px;color:#2A0B11">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#A01C30;font-weight:bold">Collabora con Elvezio</p>
<h1 style="margin:0 0 14px;font-family:Georgia,serif;color:#3E1019;font-size:26px">Grazie ${esc(d.nome)}!</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5">Abbiamo ricevuto la tua conferma per il pacchetto <b>${esc(pac)}</b>.</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5">Ti scriviamo noi nei prossimi giorni per l'acconto del 50% e per fissare il giorno delle riprese. Il saldo si paga alla pubblicazione del reel.</p>
<p style="margin:18px 0 0;font-size:15px">Il Signor Elvezio<br><a href="https://www.instagram.com/ilsignorelvezio/" style="color:#A01C30">@ilsignorelvezio</a></p></div></div>`;
    await sendMail(d.email, 'Elvezio ha ricevuto la tua conferma', html, text);
  } catch {}
  return res.status(200).json({ ok: true });
}
