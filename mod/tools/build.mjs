// Compila y empaqueta un mod sin Gradle: javac contra la instalación de NeoForge de CurseForge y el jar con la herramienta del JDK.
// Uso (desde mod/): node tools/build.mjs link|golem   →  build/libs/<mod_id>-<versión>+<mc>.jar
// El mod golem compila también contra las clases de link (su puente de cliente es opcional en tiempo de ejecución).
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const mod = process.argv[2];
if (!['link', 'golem'].includes(mod)) throw new Error('Uso: node tools/build.mjs link|golem');
const JDK = process.env.JDK_BIN || 'C:/Program Files/Java/jdk-25.0.2/bin';
const readProps = f => Object.fromEntries(readFileSync(f, 'utf8').split(/\r?\n/).filter(l => /^[a-z_]+=/.test(l)).map(l => l.split(/=(.*)/s).slice(0, 2)));
const props = { ...readProps('mod.properties'), ...readProps(join(mod, 'module.properties')) };

if (!existsSync('build/classpath.txt')) execFileSync('node', ['tools/classpath.mjs'], { stdio: 'inherit' });
const sources = [];
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.java')) sources.push(p); } };
walk(join(mod, 'java'));

const classes = join('build', mod, 'classes');
rmSync(join('build', mod), { recursive: true, force: true });
mkdirSync(classes, { recursive: true });
let cp = readFileSync('build/classpath.txt', 'utf8');
if (mod === 'golem') {
  if (!existsSync('build/link/classes')) throw new Error('Compila antes link: node tools/build.mjs link');
  cp += ';build/link/classes';
}
const argfile = join('build', mod, 'javac.args');
writeFileSync(argfile, ['--release', '21', '-encoding', 'UTF-8', '-proc:none', '-Xlint:-options', '-nowarn', '-cp', JSON.stringify(cp), '-d', JSON.stringify(classes), ...sources.map(s => JSON.stringify(s))].join('\n'));
execFileSync(join(JDK, 'javac'), ['@' + argfile], { stdio: 'inherit' });

const out = join('build', mod, 'jar');
mkdirSync(join(out, 'META-INF'), { recursive: true });
cpSync(classes, out, { recursive: true });
if (existsSync(join(mod, 'resources'))) cpSync(join(mod, 'resources'), out, { recursive: true });
const toml = readFileSync(join(mod, 'neoforge.mods.toml'), 'utf8').replace(/\$\{(\w+)\}/g, (m, k) => {
  if (!(k in props)) throw new Error(`Falta ${k} en mod.properties o ${mod}/module.properties`);
  return props[k];
});
writeFileSync(join(out, 'META-INF', 'neoforge.mods.toml'), toml);
writeFileSync(join(out, 'pack.mcmeta'), JSON.stringify({ pack: { description: `${props.mod_name} resources`, pack_format: 34 } }, null, 2));
const manifest = join('build', mod, 'MANIFEST.MF');
writeFileSync(manifest, `Manifest-Version: 1.0\nImplementation-Title: ${props.mod_name}\nImplementation-Version: ${props.mod_version}\nImplementation-Vendor: MGH Projects\n`);
const file = `build/libs/${props.mod_id}-${props.mod_version}+${props.minecraft_version}.jar`;
mkdirSync('build/libs', { recursive: true });
if (existsSync(file)) rmSync(file);
execFileSync(join(JDK, 'jar'), ['--create', '--file', file, '--manifest', manifest, '-C', out, '.'], { stdio: 'inherit' });
console.log(file);
