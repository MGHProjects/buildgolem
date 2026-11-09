// Semilla: cuenta del sistema, workspace de ejemplo (ATM10 Aeronautics, indexado de verdad) y los 4 diseños originales en la galería.
// Uso: node scripts/seed.js <carpeta con los .js de diseños>   (los archivos del modpack deben estar ya en data/workspaces/atm10-demo/files)
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { one, run } from '../src/db.js';
import { hashPassword, token, id } from '../src/security.js';
import { encode, decode, stats } from '../src/design/format.js';
import { wsDir, enqueue } from '../src/workspace/importer.js';
import { reader } from '../src/workspace/reader.js';
import { validateModel } from '../src/design/validate.js';

const designsDir = resolve(process.argv[2] || '../seed/designs'), WS = 'atm10-demo';
const SEEDS = [
  ['mekanism.js', 'sala-mekanism', 'Sala Mekanism', 'Reactor de fisión con dos turbinas, SPS y antimateria, cuatro líneas ×5 y plantas de gases. 41 × 41 × 15 bajo tierra.'],
  ['diseno.js', 'centro-ae2', 'Centro AE2', 'Centro de almacenamiento AE2 de 43 × 43 con racks de discos por sectores, P2P y pantallas de estado con CC: Tweaked.'],
  ['p2p.js', 'red-p2p', 'Red P2P autónoma', 'Red AE2 mínima que fabrica sola ME P2P Tunnels, alimentada por un Ender Gate de Powah.'],
  ['granja.js', 'laboratorio-hnn', 'Laboratorio de golems (HNN)', 'Granja de hierro con Hostile Neural Networks y Data Center, sin abejas ni aldeanos.'],
];

// 1. cuenta del sistema (sin contraseña conocida: nadie entra con ella)
run("UPDATE users SET name = 'BuildGolem', handle = 'buildgolem', email = 'system@buildgolem.invalid' WHERE handle = 'craftometry'");   // cuenta del sistema con el nombre nuevo
let sys = one("SELECT * FROM users WHERE handle = 'buildgolem'");
if (!sys) {
  run('INSERT INTO users (id, email, name, handle, pass, lang, created, verified) VALUES (?, ?, ?, ?, ?, ?, ?, 1)', id(), 'system@buildgolem.invalid', 'BuildGolem', 'buildgolem', await hashPassword(token()), 'es', Date.now());
  sys = one("SELECT * FROM users WHERE handle = 'buildgolem'");
}
run('UPDATE users SET verified = 1 WHERE id = ?', sys.id);

// 2. workspace de ejemplo
if (!one('SELECT 1 FROM workspaces WHERE id = ?', WS)) {
  if (!existsSync(join(wsDir(WS), 'files', 'mods'))) throw new Error(`Copia antes mods/, config/ y kubejs/ a ${join(wsDir(WS), 'files')}`);
  run('INSERT INTO workspaces (id, user_id, name, source, mc_version, loader, status, bytes, created, updated) VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, ?)',
    WS, 'ATM10 Aeronautics', 'upload', '1.21.1', 'neoforge', 'queued', Date.now(), Date.now());
}
const ws = () => one('SELECT * FROM workspaces WHERE id = ?', WS);
if (ws().status !== 'ready') {
  mkdirSync(wsDir(WS), { recursive: true });
  enqueue(WS);
  for (let i = 0; ws().status !== 'ready'; i++) {
    if (ws().status === 'error') throw new Error(ws().error);
    if (i % 10 === 0) console.log('indexando…', ws().progress || '');
    await new Promise(r => setTimeout(r, 2000));
  }
}
console.log('workspace listo:', ws().stats);

// 3. diseños: el modelo del motor tal cual, con el tamaño real de cada bloque del índice
const blocks = new Map(reader(WS).blocks.map(b => [b.id, b]));
const KEEP = ['P', 'BLOCKS', 'TERMS', 'ZONES', 'W', 'WX', 'WZ', 'H', 'WALLS', 'FIBER', 'CHANNELS', 'ITEMS', 'PATTERNS', 'SCREENS', 'INFO', 'TITLE', 'SUB', 'SKY', 'EXTRA_TEX', 'PIT', 'ENTRIES', 'STATS', 'PROCESS'];
for (const [file, slug, title, summary] of [...SEEDS].reverse()) {          // al revés: la galería ordena por fecha y la primera sale arriba
  const mod = await import(pathToFileURL(join(designsDir, file)).href);
  const M = Object.fromEntries(KEEP.filter(k => mod[k] !== undefined).map(k => [k, mod[k]]));
  for (const s of Object.values(M.P)) { const b = blocks.get(s.id); if (b && b.size.some(v => v > 1)) { s.size = b.size; s.offset = b.offset; } }
  const doc = encode(M), st = stats(decode(doc)), v = validateModel(decode(doc));
  const prev = one('SELECT id FROM designs WHERE slug = ?', slug), now = Date.now();
  if (prev) run('UPDATE designs SET data = ?, size = ?, blocks = ?, title = ?, summary = ?, updated = ? WHERE id = ?', JSON.stringify(doc), JSON.stringify(st.size), st.blocks, title, summary, now, prev.id);
  else run("INSERT INTO designs (id, user_id, workspace_id, title, slug, summary, visibility, data, size, blocks, created, updated) VALUES (?, ?, ?, ?, ?, ?, 'public', ?, ?, ?, ?, ?)",
    id(), sys.id, WS, title, slug, summary, JSON.stringify(doc), JSON.stringify(st.size), st.blocks, now, now);
  console.log(`${slug}: ${st.blocks} bloques, ${st.size.join('×')}, ${v.errorCount} colisiones por tamaño real`, v.errors.slice(0, 3).map(e => e.msg));
}
process.exit(0);
