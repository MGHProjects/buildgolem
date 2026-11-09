// Classpath para compilar el mod con javac contra la instalación de CurseForge (NeoForge 21.1.250, Minecraft 1.21.1).
// Uso: node tools/classpath.mjs [carpeta Install de CurseForge]  →  build/classpath.txt
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] || 'C:/Users/mique/curseforge/minecraft/Install';
const L = join(ROOT, 'libraries'), jars = new Set();
const fromMaven = n => { const [g, a, v, c] = n.split(':'); return join(L, ...g.split('.'), a, v, `${a}-${v}${c ? '-' + c : ''}.jar`); };
for (const f of ['versions/neoforge-21.1.250/neoforge-21.1.250.json', 'versions/1.21.1/1.21.1.json']) {
  const j = JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
  for (const lib of j.libraries || []) {
    const p = lib.downloads?.artifact?.path ? join(L, lib.downloads.artifact.path) : fromMaven(lib.name);
    if (existsSync(p) && !p.includes('natives')) jars.add(p);
  }
}
for (const p of ['net/neoforged/neoforge/21.1.250/neoforge-21.1.250-client.jar', 'net/minecraft/client/1.21.1-20240808.144430/client-1.21.1-20240808.144430-srg.jar', 'net/neoforged/neoforge/21.1.250/neoforge-21.1.250-universal.jar']) jars.add(join(L, p));
const list = [...jars].map(p => p.split('\\').join('/'));
mkdirSync('build', { recursive: true });
writeFileSync('build/classpath.txt', list.join(';'));
console.log(list.length, 'jars');
