// Lectura de un workspace ya indexado: archivos por ruta interna (sin abrir todos los jars), índice de bloques y recetas.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readEntry } from './zip.js';
import { resolveModel, OPEN_LICENSE } from './indexer.js';
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
      if (!this.modelCache.has(ref)) this.modelCache.set(ref, ref.split('+').flatMap(r => resolveModel(this, r)));
      out[ref] = this.modelCache.get(ref);
    }
    return out;
  }
  color(key) {
    if (!this.colors.has(key)) { let c = null; try { c = averageColor(this.texture(key)); } catch { /* textura rara */ } this.colors.set(key, c); }
    return this.colors.get(key);
  }
}
