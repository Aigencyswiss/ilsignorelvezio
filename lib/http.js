export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
export function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b || '{}'); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}
// giochi del parco: si entra in classifica solo con l'account
export const LOGIN_GAMES = ['dove', 'catapulta', 'diga', 'pardo', 'piode', 'vendemmia', 'scale', 'slitta', 'pedalo'];
export const GAMES = { autopostale: ['facile', 'medio', 'difficile'], dove: ['normale'], catapulta: ['facile', 'medio', 'difficile'], diga: ['facile', 'medio', 'difficile'], pardo: ['facile', 'medio', 'difficile'], piode: ['facile', 'medio', 'difficile'], vendemmia: ['facile', 'medio', 'difficile'], scale: ['facile', 'medio', 'difficile'], slitta: ['facile', 'medio', 'difficile'], pedalo: ['facile', 'medio', 'difficile'] };
// Punteggio massimo credibile per gioco, dato il tempo di gioco in secondi.
export const MAXSCORE = {
  autopostale: s => s * 35 + 120,          // metri al secondo massimi credibili
  dove: s => Math.min(10000, s * 700 + 300), // 10 turni da max 1000 punti, almeno ~1.5 s a turno
  catapulta: s => Math.min(9000, s * 75 + 300), // partita da 75 s
  diga: s => Math.min(6500, s * 200 + 600),   // 6 salti, ~5 s ciascuno
  pardo: s => Math.min(16000, s * 260 + 500), // partita da 60 s
  piode: s => Math.min(16000, s * 200 + 600), // partita da 75 s
  vendemmia: s => Math.min(15000, s * 220 + 600), // partita da 60 s
  scale: s => Math.min(80000, s * 450 + 1000),   // senza fine, max ~8 gradini al secondo
  slitta: s => Math.min(100000, s * 500 + 1000), // discesa senza fine
  pedalo: s => Math.min(20000, s * 250 + 800)    // partita da 60 s
};
