// Crea public/parco/ticino.json: contorno del Ticino, laghi e i 106 comuni
// (nome, coordinate, poligono) dai dati aperti swisstopo/UST del pacchetto swiss-maps.
// Gira su Vercel a ogni deploy (npm run build).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import * as topo from 'topojson-client';
import { geoPath, geoTransform, geoCentroid, geoBounds } from 'd3-geo';

const require = createRequire(import.meta.url);
const base = path.dirname(require.resolve('swiss-maps/package.json'));
const t = JSON.parse(fs.readFileSync(path.join(base, '2024/ch-combined.json')));
const t25 = JSON.parse(fs.readFileSync(path.join(base, '2025/ch-combined.json')));

function readDbf(f) {
  const b = fs.readFileSync(f);
  const n = b.readUInt32LE(4), hl = b.readUInt16LE(8), rl = b.readUInt16LE(10);
  const fields = [];
  for (let i = 32; b[i] !== 0x0d; i += 32) fields.push([b.slice(i, i + 11).toString('latin1').split('\0')[0], b[i + 16]]);
  const rows = [];
  for (let r = 0; r < n; r++) {
    let o = hl + r * rl + 1; const row = {};
    for (const [nm, ln] of fields) { row[nm] = b.slice(o, o + ln).toString('utf8').replace(/\0/g, '').trim(); o += ln; }
    rows.push(row);
  }
  return rows;
}

const names = {};
readDbf(path.join(base, '2024/municipalities.dbf')).forEach(r => { if (r.KTNR === '21') names[r.id] = r.name; });
const isComune = id => names[id] && !names[id].startsWith("C'za"); // le "comunanze" non sono comuni
const mun = topo.feature(t, t.objects.municipalities).features.filter(f => isComune(f.id));
const ti = topo.merge(t, t.objects.municipalities.geometries.filter(g => names[g.id]));
const lakes = topo.feature(t25, t25.objects.lakes).features.filter(f => [9709, 9712].includes(+f.id));

const [[x0, y0], [x1, y1]] = geoBounds({ type: 'FeatureCollection', features: mun });
const lat0 = (y0 + y1) / 2, c = Math.cos(lat0 * Math.PI / 180), W = 1000, K = W / ((x1 - x0) * c), H = Math.round((y1 - y0) * K);
const P = (lon, lat) => [(lon - x0) * c * K, (y1 - lat) * K];
const pathGen = geoPath(geoTransform({ point(x, y) { const p = P(x, y); this.stream.point(p[0], p[1]); } }));
const r1 = s => (s || '').replace(/(\d+\.\d)\d+/g, '$1');
const nice = n => n.replace('Bosco/Gurin', 'Bosco Gurin');

const out = {
  src: 'Confini: UST/swisstopo (pacchetto swiss-maps), 2024',
  W, H, bbox: [x0, y0, x1, y1], k: [c * K, K],
  ti: r1(pathGen(ti)),
  lakes: lakes.map(f => ({ n: +f.id === 9709 ? 'Lago di Lugano' : 'Lago Maggiore', d: r1(pathGen(f)) })),
  m: mun.map(f => {
    const [lon, lat] = geoCentroid(f); const p = P(lon, lat);
    return { id: +f.id, n: nice(names[f.id]), lon: +lon.toFixed(4), lat: +lat.toFixed(4), x: +p[0].toFixed(1), y: +p[1].toFixed(1), d: r1(pathGen(f)) };
  }).sort((a, b) => a.n.localeCompare(b.n, 'it'))
};
fs.mkdirSync('public/parco', { recursive: true });
fs.writeFileSync('public/parco/ticino.json', JSON.stringify(out));
console.log('ticino.json:', out.m.length, 'comuni,', fs.statSync('public/parco/ticino.json').size, 'byte');
