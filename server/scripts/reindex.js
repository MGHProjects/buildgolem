// Rehace el índice completo de un workspace (bloques, recetas, tags, archivos y objetos) con los jars actuales, incluidos los
// mods que vienen dentro de otro jar. Uso: node scripts/reindex.js <id>   (con DATA_DIR del servidor) y después reiniciar el servicio.
import { wsDir } from '../src/workspace/importer.js';
import { buildIndex, workspaceJars } from '../src/workspace/indexer.js';
import { run } from '../src/db.js';

const id = process.argv[2];
if (!id) { console.error('Uso: node scripts/reindex.js <id del workspace>'); process.exit(1); }
const stats = buildIndex(wsDir(id), workspaceJars(wsDir(id)), m => console.log(m));
run('UPDATE workspaces SET stats = ? WHERE id = ?', JSON.stringify(stats), id);
console.log(id, stats);
process.exit(0);
