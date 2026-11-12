// Rehace index/files.json de cada workspace con el índice actual (ahora incluye las recetas, que search_recipes lee).
// Uso: node scripts/reindex-files.js   (con DATA_DIR del servidor) y después reiniciar el servicio, que guarda los índices en memoria.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { all } from '../src/db.js';
import { wsDir } from '../src/workspace/importer.js';
import { Pack, fileIndex } from '../src/workspace/indexer.js';

for (const w of all("SELECT id FROM workspaces WHERE status = 'ready'")) {
  const dir = wsDir(w.id), path = join(dir, 'index', 'files.json');
  if (!existsSync(path)) { console.log(w.id, 'sin índice'); continue; }
  const jars = JSON.parse(readFileSync(path, 'utf8')).jars.map(j => join(dir, j));
  const files = fileIndex(new Pack(jars), dir);
  writeFileSync(path, JSON.stringify({ jars: jars.map(j => relative(dir, j)), files }));
  console.log(w.id, Object.keys(files).length, 'archivos ·', Object.keys(files).filter(k => k.startsWith('data/')).length, 'recetas');
}
process.exit(0);
