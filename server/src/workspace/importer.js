// Importación de modpacks: zip de la instancia, .mrpack de Modrinth (subido o por proyecto) y export de CurseForge.
// Cola de un trabajo a la vez; el estado se guarda en la tabla workspaces.
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync, statSync, linkSync, copyFileSync, createWriteStream, renameSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DATA_DIR, CURSEFORGE_API_KEY } from '../config.js';
import { one, run } from '../db.js';
import { listZip, readEntry, safeRelPath } from './zip.js';
import { buildIndex, workspaceJars } from './indexer.js';
import { cfEnabled, packFile, manifestFiles } from '../curseforge.js';

export const wsDir = id => join(DATA_DIR, 'workspaces', id);
const set = (id, fields) => run(`UPDATE workspaces SET ${Object.keys(fields).map(k => `${k} = ?`).join(', ')}, updated = ? WHERE id = ?`, ...Object.values(fields), Date.now(), id);

export function dirBytes(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const f of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, f.name); n += f.isDirectory() ? dirBytes(p) : statSync(p).size; }
  return n;
}

const MODRINTH_HOSTS = new Set(['cdn.modrinth.com', 'github.com', 'raw.githubusercontent.com', 'gitlab.com', 'objects.githubusercontent.com']);
async function download(url, dest, { sha1, sha512, headers = {}, maxBytes = 2 ** 31 } = {}) {
  const r = await fetch(url, { headers: { 'user-agent': 'BuildGolem/0.1 (modpack importer)', ...headers }, signal: AbortSignal.timeout(10 * 60_000) });
  if (!r.ok) throw new Error(`Descarga ${r.status}: ${url}`);
  mkdirSync(dirname(dest), { recursive: true });
  const h1 = createHash('sha1'), h5 = createHash('sha512');
  let n = 0;
  const tmp = dest + '.part';
  await pipeline(Readable.fromWeb(r.body), async function* (src) { for await (const ch of src) { n += ch.length; if (n > maxBytes) throw new Error('Archivo demasiado grande'); h1.update(ch); h5.update(ch); yield ch; } }, createWriteStream(tmp));
  if ((sha1 && h1.digest('hex') !== sha1) || (sha512 && h5.digest('hex') !== sha512)) { rmSync(tmp, { force: true }); throw new Error(`Hash distinto: ${url}`); }
  renameSync(tmp, dest);
  return n;
}

// jar vanilla de la versión (texturas y modelos de Minecraft), desde los servidores de Mojang, compartido entre workspaces
async function vanillaJar(version) {
  const cache = join(DATA_DIR, 'vanilla', `${version}.jar`);
  if (existsSync(cache)) return cache;
  const manifest = await (await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')).json();
  const v = manifest.versions.find(x => x.id === version);
  if (!v) throw new Error(`Versión de Minecraft desconocida: ${version}`);
  const meta = await (await fetch(v.url)).json();
  await download(meta.downloads.client.url, cache, { sha1: meta.downloads.client.sha1 });
  return cache;
}

function extract(zipPath, entries, dest, rename = n => n) {
  for (const e of entries) {
    const rel = safeRelPath(rename(e.name));
    if (!rel) continue;
    const out = join(dest, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, readEntry(zipPath, e, 512 * 1024 * 1024));
  }
}
const KEEP = /^(mods\/[^/]+\.jar|config\/.+|defaultconfigs\/.+|kubejs\/(assets|data)\/.+|minecraftinstance\.json)$/;

async function processUpload(ws, dir, log) {
  const zip = join(dir, 'upload.zip'), entries = listZip(zip), names = entries.map(e => e.name);
  const files = join(dir, 'files');
  let mc = ws.mc_version, loader = ws.loader;
  if (names.includes('modrinth.index.json')) {                                   // .mrpack
    const idx = JSON.parse(readEntry(zip, entries.find(e => e.name === 'modrinth.index.json')).toString('utf8'));
    mc ||= idx.dependencies?.minecraft; loader ||= Object.keys(idx.dependencies || {}).find(k => k !== 'minecraft');
    extract(zip, entries.filter(e => /^(client-)?overrides\//.test(e.name)), files, n => n.replace(/^(client-)?overrides\//, ''));
    const list = (idx.files || []).filter(f => f.env?.client !== 'unsupported' && /^mods\/[^/]+\.jar$/.test(f.path));
    let i = 0;
    for (const f of list) {
      log(`Descargando mods ${++i}/${list.length}`);
      const url = f.downloads.find(u => MODRINTH_HOSTS.has(new URL(u).hostname));
      if (!url) continue;
      const dest = join(files, safeRelPath(f.path));
      if (!existsSync(dest)) await download(url, dest, { sha1: f.hashes?.sha1, sha512: f.hashes?.sha512 });
    }
  } else if (names.includes('manifest.json') && names.some(n => n.startsWith('overrides/'))) {   // export de CurseForge
    const man = JSON.parse(readEntry(zip, entries.find(e => e.name === 'manifest.json')).toString('utf8'));
    mc ||= man.minecraft?.version; loader ||= man.minecraft?.modLoaders?.[0]?.id?.split('-')[0];
    extract(zip, entries.filter(e => e.name.startsWith('overrides/')), files, n => n.slice('overrides/'.length));
    if (!cfEnabled()) throw new Error('Este zip es un export de CurseForge sin los mods dentro. Comprime la carpeta de la instancia (la que tiene mods, config y kubejs) y súbela.');
    log('Pidiendo la lista de mods a CurseForge');
    const { ok, missing } = await manifestFiles(man);
    let i = 0;
    const next = async () => {                                                     // 4 descargas a la vez
      while (i < ok.length) {
        const f = ok[i++];
        log(`Descargando mods ${i}/${ok.length}`);
        const dest = join(files, 'mods', f.fileName.replace(/[^\w.+-]/g, '_'));
        if (!existsSync(dest)) await download(f.url, dest, { sha1: f.sha1, headers: { 'x-api-key': CURSEFORGE_API_KEY } });
      }
    };
    await Promise.all([next(), next(), next(), next()]);
    writeFileSync(join(dir, 'missing.json'), JSON.stringify(missing));
  } else {                                                                        // carpeta de instancia comprimida
    const prefix = (names.find(n => /(^|\/)mods\/[^/]+\.jar$/.test(n)) || '').replace(/mods\/[^/]+\.jar$/, '');
    if (!names.some(n => n.startsWith(prefix + 'mods/'))) throw new Error('No encuentro la carpeta mods/ dentro del zip');
    extract(zip, entries.filter(e => e.name.startsWith(prefix) && KEEP.test(e.name.slice(prefix.length))), files, n => n.slice(prefix.length));
    const inst = join(files, 'minecraftinstance.json');
    if (!mc && existsSync(inst)) { try { const j = JSON.parse(readFileSync(inst, 'utf8')); mc = j.gameVersion; loader ||= j.baseModLoader?.name?.split('-')[0]; } catch { /* sin datos de versión */ } }
  }
  rmSync(zip, { force: true });
  return { mc, loader };
}

const queue = [];
let busy = false;
export function enqueue(id) { queue.push(id); pump(); }
async function pump() {
  if (busy || !queue.length) return;
  busy = true;
  const wid = queue.shift(), ws = one('SELECT * FROM workspaces WHERE id = ?', wid), dir = wsDir(wid);
  const log = msg => set(wid, { progress: msg });
  try {
    set(wid, { status: 'processing', error: null });
    const imported = existsSync(join(dir, 'files'));                              // al reindexar (mods añadidos a mano) no se vuelve a descargar
    if (ws.source === 'curseforge' && !imported && !existsSync(join(dir, 'upload.zip'))) {
      log('Buscando el modpack en CurseForge');
      const { file } = await packFile(ws.source_ref, ws.mc_version);
      log('Descargando el modpack');
      await download(file.downloadUrl, join(dir, 'upload.zip'), { sha1: file.hashes?.find(h => h.algo === 1)?.value, headers: { 'x-api-key': CURSEFORGE_API_KEY } });
      ws.mc_version ||= (file.gameVersions || []).find(v => /^1\.\d+(\.\d+)?$/.test(v));
    }
    if (ws.source === 'modrinth' && !imported && !existsSync(join(dir, 'upload.zip'))) {
      log('Buscando el modpack en Modrinth');
      const vers = await (await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(ws.source_ref)}/version`, { headers: { 'user-agent': 'BuildGolem/0.1' } })).json();
      const v = Array.isArray(vers) && (vers.find(x => x.id === ws.mc_version) || vers[0]);
      const file = v?.files?.find(f => f.primary) || v?.files?.[0];
      if (!file?.url?.endsWith('.mrpack')) throw new Error('No encuentro un .mrpack para ese proyecto');
      log('Descargando el .mrpack');
      await download(file.url, join(dir, 'upload.zip'), { sha1: file.hashes?.sha1 });
      set(wid, { mc_version: null });
      ws.mc_version = v.game_versions?.[0];
    }
    if (existsSync(join(dir, 'upload.zip'))) {
      log('Descomprimiendo');
      const { mc, loader } = await processUpload(ws, dir, log);
      set(wid, { mc_version: mc || ws.mc_version, loader: loader || ws.loader });
      ws.mc_version = mc || ws.mc_version;
    }
    if (!ws.mc_version) throw new Error('No sé la versión de Minecraft del pack: indícala al crear el workspace');
    log('Descargando Minecraft ' + ws.mc_version);
    const vj = await vanillaJar(ws.mc_version), dest = join(dir, 'vanilla.jar');
    if (!existsSync(dest)) { try { linkSync(vj, dest); } catch { copyFileSync(vj, dest); } }
    const stats = buildIndex(dir, workspaceJars(dir), log);
    set(wid, { status: 'ready', progress: null, stats: JSON.stringify(stats), bytes: dirBytes(dir) });
  } catch (e) {
    console.error('workspace', wid, e);
    set(wid, { status: 'error', progress: null, error: String(e.message || e).slice(0, 500), bytes: dirBytes(dir) });
  } finally { busy = false; pump(); }
}
