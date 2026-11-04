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
export const GAMES = { autopostale: ['facile', 'medio', 'difficile'], dove: ['normale'] };
// Punteggio massimo credibile per gioco, dato il tempo di gioco in secondi.
export const MAXSCORE = {
  autopostale: s => s * 35 + 120,          // metri al secondo massimi credibili
  dove: s => Math.min(10000, s * 700 + 300) // 10 turni da max 1000 punti, almeno ~1.5 s a turno
};
