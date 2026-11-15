// Rehace index/files.json e index/items.json de cada workspace con el índice actual (recetas y manuales para los agentes, objetos para exponer).
// Uso: node scripts/reindex-files.js   (con DATA_DIR del servidor) y después reiniciar el servicio, que guarda los índices en memoria.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { all } from '../src/db.js';
import { wsDir } from '../src/workspace/importer.js';
import { Pack, fileIndex, itemIndex } from '../src/workspace/indexer.js';

for (const w of all("SELECT id FROM workspaces WHERE status = 'ready'")) {
  const dir = wsDir(w.id), path = join(dir, 'index', 'files.json');
  if (!existsSync(path)) { console.log(w.id, 'sin índice'); continue; }
  const jars = JSON.parse(readFileSync(path, 'utf8')).jars.map(j => join(dir, j));
  const pack = new Pack(jars), files = fileIndex(pack, dir), items = itemIndex(pack);
  writeFileSync(path, JSON.stringify({ jars: jars.map(j => relative(dir, j)), files }));
  writeFileSync(join(dir, 'index', 'items.json'), JSON.stringify(items));
  console.log(w.id, Object.keys(files).length, 'archivos ·', Object.keys(files).filter(k => k.startsWith('data/')).length, 'recetas ·', items.length, 'objetos');
}
process.exit(0);
