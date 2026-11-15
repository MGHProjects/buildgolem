// Lectura de un workspace ya indexado: archivos por ruta interna (sin abrir todos los jars), índice de bloques y recetas.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readEntry } from './zip.js';
import { resolveModel, OPEN_LICENSE, DOC } from './indexer.js';
import { averageColor } from './png.js';
import { wsDir } from './importer.js';

const cache = new Map();                                  // id → lector (los 8 más recientes)
const CLOSED = new Set(['minecraft', 'neoforge', 'forge', 'fabric', 'c']);
export function reader(id) {
  if (cache.has(id)) { const r = cache.get(id); cache.delete(id); cache.set(id, r); return r; }
  const r = new WsReader(wsDir(id));
  cache.set(id, r);
  if (cache.size > 8) cache.delete(cache.keys().next().value);
  return r;
}
export const forget = id => cache.delete(id);

// giro de 90° de unos elementos de modelo alrededor del centro del bloque: x lleva arriba al norte, y lleva el norte al este
const FACE_TO = { x: { up: 'north', north: 'down', down: 'south', south: 'up' }, y: { north: 'east', east: 'south', south: 'west', west: 'north' } };
const SPIN = { x: { east: 90, west: 270 }, y: { up: 90, down: 270 } }, AXIS_TO = { x: { x: ['x', 1], y: ['z', -1], z: ['y', 1] }, y: { x: ['z', 1], y: ['y', 1], z: ['x', -1] } };
function turn(els, ax) {
  const P = ax === 'x' ? ([x, y, z]) => [x, z, 16 - y] : ([x, y, z]) => [16 - z, y, x], F = k => FACE_TO[ax][k] || k;
  return els.map(e => {
    const a = P(e.from), b = P(e.to);
    const faces = Object.fromEntries(Object.entries(e.faces || {}).map(([k, f]) => {
      const rot = ((f.rotation || 0) + (SPIN[ax][k] || 0)) % 360, g = { ...f, rotation: rot || undefined };
      if (f.cullface) g.cullface = F(f.cullface);
      return [F(k), g];
    }));
    const out = { ...e, from: a.map((v, i) => Math.min(v, b[i])), to: a.map((v, i) => Math.max(v, b[i])), faces };
    if (e.rotation) { const [axis, sg] = AXIS_TO[ax][e.rotation.axis]; out.rotation = { ...e.rotation, origin: P(e.rotation.origin), axis, angle: e.rotation.angle * sg }; }
    return out;
  });
}

class WsReader {
  constructor(dir) {
    this.dir = dir;
    const f = JSON.parse(readFileSync(join(dir, 'index', 'files.json'), 'utf8'));
    this.jars = f.jars.map(j => join(dir, j)); this.files = f.files;
    this.colors = new Map(); this.modelCache = new Map();
    const pre = join(dir, 'index', 'models.json');           // modelos ya resueltos (workspaces de ejemplo)
    this.prebuilt = existsSync(pre) ? JSON.parse(readFileSync(pre, 'utf8')) : {};
  }
  get blocks() { return (this._blocks ??= this.load('blocks.json')); }
  get recipes() { return (this._recipes ??= this.load('recipes.json')); }
  get items() { return (this._items ??= this.load('items.json')); }
  get tags() { return (this._tags ??= this.load('tags.json')); }
  get licenses() { const l = (this._lic ??= this.load('licenses.json')); return Array.isArray(l) ? {} : l; }
  // espacios de nombres con licencia libre: sus texturas se pueden enseñar a cualquiera
  // las texturas de Minecraft (Mojang) nunca son públicas, diga lo que diga un mods.toml
  get open() { return (this._open ??= new Set(Object.entries(this.licenses).filter(([ns, l]) => !CLOSED.has(ns) && OPEN_LICENSE.test(l)).map(([ns]) => ns))); }
  load(n) { const p = join(this.dir, 'index', n); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : (n === 'tags.json' ? {} : []); }
  read(path) {
    const f = this.files[path];
    if (!f) return null;
    if (f[5]) return readFileSync(join(this.dir, f[5]));
    return readEntry(this.jars[f[0]], { name: path, offset: f[1], csize: f[2], usize: f[3], method: f[4] });
  }
  json(path) { const b = this.read(path); if (!b) return null; try { return JSON.parse(b.toString('utf8').replace(/^﻿/, '')); } catch { return null; } }
  // texto plano de los manuales, para search_docs (se lee una vez por lector)
  get docs() {
    return (this._docs ??= Object.keys(this.files).filter(p => DOC.test(p)).map(p => {
      let t = this.read(p)?.toString('utf8') || '';
      if (p.endsWith('.json')) {
        try { const j = JSON.parse(t); t = [j.name, j.text, ...(j.pages || []).map(pg => [pg.title, pg.text].filter(Boolean).join('\n'))].filter(Boolean).join('\n'); } catch { t = ''; }
      }
      t = t.replace(/<[^>]*\bid="([^"]+)"[^>]*>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\$\([^)]*\)/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
      return { path: p, mod: p.split('/')[1], text: t };
    }).filter(d => d.text.length > 40));
  }
  // clave "ns:ruta": relativa a textures/block/ salvo item/ y part/ (convención del motor), con textures/ como reserva
  texPath(key, ext = '.png') {
    const [ns, p] = key.split(':');
    const a = `assets/${ns}/textures/${/^(item|part)\//.test(p) ? p : 'block/' + p}${ext}`;
    return this.files[a] ? a : `assets/${ns}/textures/${p}${ext}`;
  }
  texture(key, ext = '.png') { return this.read(this.texPath(key, ext)); }
  // modelos para el motor: lista de refs (o refs unidos con "+") → elementos con texturas "ns:ruta"
  models(refs) {
    const out = {};
    for (const ref of refs) {
      if (this.prebuilt[ref]) { out[ref] = this.prebuilt[ref]; continue; }
      if (!this.modelCache.has(ref)) this.modelCache.set(ref, ref.split('+').flatMap(r => {
        // "modelo@dx,dy,dz": pieza desplazada (en bloques), como las de un renderizador de bloque del mod
        const [mr, off] = r.split('@'), els = resolveModel(this, mr);
        if (!off) return els;
        // "modelo@x90y90": el giro x/y de la variante del blockstate (vara o cadena tumbada, tronco horizontal), x primero como en Minecraft
        if (/^[xy]\d/.test(off)) { let out = els; for (const [, ax, deg] of off.matchAll(/([xy])(\d+)/g)) for (let i = 0; i < (+deg / 90) % 4; i++) out = turn(out, ax); return out; }
        const d = off.split(',').map(v => (+v || 0) * 16), sh = p => p.map((v, i) => v + (d[i] || 0));
        return els.map(e => ({ ...e, from: sh(e.from), to: sh(e.to), ...(e.rotation ? { rotation: { ...e.rotation, origin: sh(e.rotation.origin) } } : {}) }));
      }));
      out[ref] = this.modelCache.get(ref);
    }
    return out;
  }
  color(key) {
    if (!this.colors.has(key)) { let c = null; try { c = averageColor(this.texture(key)); } catch { /* textura rara */ } this.colors.set(key, c); }
    return this.colors.get(key);
  }
}
