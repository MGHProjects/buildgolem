// Vuelve a leer las licencias de los mods de cada workspace (licenses.json) con el lector corregido.
// Uso: node scripts/relicense.js   (con DATA_DIR del servidor)
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { all } from '../src/db.js';
import { wsDir } from '../src/workspace/importer.js';
import { modLicenses } from '../src/workspace/indexer.js';
import { readFileSync } from 'node:fs';

for (const w of all("SELECT id FROM workspaces WHERE status = 'ready'")) {
  const dir = wsDir(w.id), files = join(dir, 'index', 'files.json');
  if (!existsSync(files)) { console.log(w.id, 'sin índice'); continue; }
  const { jars } = JSON.parse(readFileSync(files, 'utf8'));
  const lic = modLicenses(jars.map(j => join(dir, j)));
  writeFileSync(join(dir, 'index', 'licenses.json'), JSON.stringify(lic));
  console.log(w.id, Object.keys(lic).length, 'mods · mekanism:', lic.mekanism, '· minecraft:', lic.minecraft ?? '(ninguna)');
}
process.exit(0);
