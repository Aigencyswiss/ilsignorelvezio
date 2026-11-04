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
export const LOGIN_GAMES = ['dove', 'catapulta'];
export const GAMES = { autopostale: ['facile', 'medio', 'difficile'], dove: ['normale'], catapulta: ['facile', 'medio', 'difficile'] };
// Punteggio massimo credibile per gioco, dato il tempo di gioco in secondi.
export const MAXSCORE = {
  autopostale: s => s * 35 + 120,          // metri al secondo massimi credibili
  dove: s => Math.min(10000, s * 700 + 300), // 10 turni da max 1000 punti, almeno ~1.5 s a turno
  catapulta: s => Math.min(9000, s * 75 + 300) // partita da 75 s
};
