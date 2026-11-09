// Herramientas de los agentes. Todas trabajan sobre datos reales: el workspace del diseño y el propio diseño.
import { solve } from '../../../engine/process.js';
import { reader } from '../workspace/reader.js';
import { readSkill, listSkills, writeSkill } from './catalog.js';
import { decode, encode } from '../design/format.js';
import { validateModel } from '../design/validate.js';
import { safeFetch } from '../security.js';
import { SEARCH } from '../config.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { wsDir } from '../workspace/importer.js';

const obj = (props, required = []) => ({ type: 'object', properties: props, required });
const S = d => ({ type: 'string', description: d }), N = d => ({ type: 'number', description: d });

export const TOOL_DEFS = {
  ask_user: { description: 'Pregunta al jugador lo que cambia el diseño. Todas las preguntas en una llamada; termina tu turno.', parameters: obj({ questions: { type: 'array', items: obj({ question: S('pregunta'), options: { type: 'array', items: { type: 'string' } } }, ['question']) } }, ['questions']) },
  read_skill: { description: 'Carga una skill (conocimiento) por nombre.', parameters: obj({ name: S('nombre de la skill, p. ej. mods/mekanism') }, ['name']) },
  consult_agent: { description: 'Encarga una tarea a otro agente y devuelve su respuesta.', parameters: obj({ agent: S('mod-expert | optimizer | designer | researcher | process-animator | validator | skill-writer'), task: S('tarea concreta con todo el contexto necesario') }, ['agent', 'task']) },
  search_blocks: { description: 'Busca bloques del modpack por texto (id o nombre).', parameters: obj({ query: S('texto'), mod: S('id del mod (opcional)') }, ['query']) },
  get_block: { description: 'Detalle de un bloque: tamaño real, texturas, familia de tier.', parameters: obj({ id: S('id del bloque, ns:nombre') }, ['id']) },
  search_recipes: { description: 'Busca recetas reales por salida, entrada, tipo o mod.', parameters: obj({ output: S('id (parcial) de la salida'), input: S('id (parcial) de una entrada'), type: S('tipo de receta'), mod: S('mod') }) },
  get_config: { description: 'Lee la config de un mod: sin "file" lista archivos; con "file" devuelve su texto.', parameters: obj({ mod: S('id del mod'), file: S('archivo (opcional)') }, ['mod']) },
  calc: { description: 'Calcula una expresión aritmética exacta (+ - * / ^ ( ) ceil floor min max round).', parameters: obj({ expr: S('expresión') }, ['expr']) },
  get_design: { description: 'Resumen del diseño: tamaño, paleta, recuento por tipo y bloques de una zona.', parameters: obj({ box: { type: 'array', items: { type: 'number' }, description: 'opcional [x0,y0,z0,x1,y1,z1]' } }) },
  edit_design: { description: 'Aplica cambios al diseño. ops: {op:"place",x,y,z,block,facing?} · {op:"fill",from:[x,y,z],to:[x,y,z],block} · {op:"remove",from,to} · {op:"note",x,y,z,text}.', parameters: obj({ ops: { type: 'array', items: { type: 'object' } } }, ['ops']) },
  validate_design: { description: 'Comprueba colisiones por tamaño real, bloques inexistentes, flotantes y límites.', parameters: obj({}) },
  set_process: { description: 'Guarda el grafo de proceso (nodos, aristas con caudal, cuello de botella) para animarlo.', parameters: obj({ graph: { type: 'object' } }, ['graph']) },
  web_search: { description: 'Busca en internet.', parameters: obj({ query: S('consulta') }, ['query']) },
  fetch_url: { description: 'Descarga el texto de una página web pública.', parameters: obj({ url: S('URL https') }, ['url']) },
  write_skill: { description: 'Guarda la skill de un mod para este workspace.', parameters: obj({ mod: S('id del mod'), markdown: S('contenido') }, ['mod', 'markdown']) },
};

// calculadora sin eval: números, + - * / ^, paréntesis y unas pocas funciones
export function calc(expr) {
  const src = String(expr).replace(/\s+/g, ''), FN = { ceil: Math.ceil, floor: Math.floor, round: Math.round, min: Math.min, max: Math.max, sqrt: Math.sqrt };
  let i = 0;
  const peek = () => src[i], eat = ch => (src[i] === ch ? (i++, true) : false);
  const num = () => { const m = src.slice(i).match(/^\d+(\.\d+)?(e[+-]?\d+)?/i); if (!m) throw new Error(`Esperaba un número en ${i}`); i += m[0].length; return +m[0]; };
  const atom = () => {
    if (eat('(')) { const v = add(); if (!eat(')')) throw new Error('Falta )'); return v; }
    if (eat('-')) return -atom();
    const fm = src.slice(i).match(/^[a-z]+/);
    if (fm) { const f = FN[fm[0]]; if (!f) throw new Error(`Función desconocida ${fm[0]}`); i += fm[0].length; if (!eat('(')) throw new Error('Falta ('); const args = [add()]; while (eat(',')) args.push(add()); if (!eat(')')) throw new Error('Falta )'); return f(...args); }
    return num();
  };
  const pow = () => { const b = atom(); return eat('^') ? b ** pow() : b; };
  const mul = () => { let v = pow(); for (;;) { if (eat('*')) v *= pow(); else if (eat('/')) v /= pow(); else return v; } };
  const add = () => { let v = mul(); for (;;) { if (eat('+')) v += mul(); else if (eat('-')) v -= mul(); else return v; } };
  const v = add();
  if (i < src.length) throw new Error(`Sobra "${src.slice(i)}"`);
  void peek;
  return v;
}

const brief = s => (JSON.stringify(s).length > 12_000 ? JSON.stringify(s).slice(0, 12_000) + '…(recortado)' : JSON.stringify(s));
const FACING = { north: 'n', south: 's', east: 'e', west: 'w', n: 'n', s: 's', e: 'e', w: 'w' };

// ctx: { design (doc), workspaceId, userId, saveDesign(doc), runAgent(name, task), onAsk(questions) }
export async function runTool(name, args, ctx) {
  const ws = () => { if (!ctx.workspaceId) throw new Error('Este diseño no tiene workspace: crea uno con tu modpack y asígnalo al diseño'); return reader(ctx.workspaceId); };
  switch (name) {
    case 'ask_user': ctx.onAsk(args.questions || []); return 'Preguntas enviadas al jugador. Termina tu turno y espera su respuesta.';
    case 'read_skill': return readSkill(String(args.name), ctx.workspaceId) || `No existe la skill "${args.name}". Disponibles: ${Object.keys(listSkills(ctx.workspaceId)).join(', ')}`;
    case 'consult_agent': return await ctx.runAgent(String(args.agent), String(args.task));
    case 'search_blocks': {
      const words = String(args.query || '').toLowerCase().split(/\s+/).filter(Boolean);
      const hits = ws().blocks.filter(b => (!args.mod || b.id.startsWith(args.mod + ':')) && words.every(w => `${b.id} ${b.name} ${b.nameEs || ''}`.toLowerCase().includes(w)));
      return brief({ total: hits.length, items: hits.slice(0, 25).map(b => ({ id: b.id, name: b.name, size: b.size, tier: b.tier?.tier })) });
    }
    case 'get_block': {
      const r = ws(), b = r.blocks.find(x => x.id === args.id);
      if (!b) return `No existe ${args.id} en este modpack`;
      const family = b.tier ? r.blocks.filter(x => x.tier?.family === b.tier.family).map(x => x.id) : [];
      return brief({ ...b, family });
    }
    case 'search_recipes': {
      const r = ws(), { output, input, type, mod } = args;
      const hits = r.recipes.filter(x => (!type || x.type.includes(type)) && (!mod || x.id.startsWith(mod + ':')) && (!output || x.out.some(o => o.includes(output))) && (!input || x.in.some(i => i.includes(input))));
      return brief({ total: hits.length, items: hits.slice(0, 8).map(x => ({ id: x.id, type: x.type, recipe: r.json(x.path) })) });
    }
    case 'get_config': {
      if (!ctx.workspaceId) return 'Sin workspace';
      const dir = join(wsDir(ctx.workspaceId), 'files', 'config');
      if (!existsSync(dir)) return 'Este workspace no trae configs (súbelo con la carpeta config/).';
      const files = readdirSync(dir, { recursive: true }).map(String).filter(f => /\.(toml|json5?|cfg)$/.test(f) && f.toLowerCase().includes(String(args.mod).toLowerCase()));
      if (!args.file) return brief({ files: files.slice(0, 30) });
      if (!files.includes(args.file)) return 'Archivo no encontrado';
      return readFileSync(join(dir, args.file), 'utf8').slice(0, 12_000);
    }
    case 'calc': return String(calc(args.expr));
    case 'get_design': {
      const m = decode(ctx.design), counts = {};
      for (const b of m.BLOCKS) counts[b.t] = (counts[b.t] || 0) + 1;
      const box = Array.isArray(args.box) && args.box.length === 6 ? args.box : null;
      const inBox = b => box && b.x >= box[0] && b.y >= box[1] && b.z >= box[2] && b.x <= box[3] && b.y <= box[4] && b.z <= box[5];
      return brief({ title: m.TITLE, size: [m.WX ?? m.W, m.H, m.WZ ?? m.W], palette: Object.fromEntries(Object.entries(m.P).map(([k, v]) => [k, v.id])), counts,
        blocks: box ? m.BLOCKS.filter(inBox).slice(0, 400).map(b => [b.x, b.y, b.z, b.t, b.f]) : undefined, process: m.PROCESS ? 'sí' : 'no' });
    }
    case 'edit_design': {
      const m = decode(ctx.design), r = ctx.workspaceId ? reader(ctx.workspaceId) : null, at = new Map(m.BLOCKS.map(b => [`${b.x},${b.y},${b.z}`, b]));
      const keyFor = id => {
        let k = Object.keys(m.P).find(k => m.P[k].id === id);
        if (k) return k;
        const blk = r?.blocks.find(b => b.id === id);
        if (!blk) throw new Error(`No existe ${id} en este modpack`);
        k = id.split(':')[1].slice(0, 24);
        while (m.P[k]) k += '_';
        m.P[k] = { n: blk.nameEs || blk.name, id, model: blk.model, yaw: blk.yaw, size: blk.size, offset: blk.offset, tier: blk.tier || undefined };
        return k;
      };
      let n = 0;
      for (const op of (args.ops || []).slice(0, 2000)) {
        const box = (a, b) => { const lo = a.map((v, i) => Math.min(v, b[i])), hi = a.map((v, i) => Math.max(v, b[i])); if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 50_000) throw new Error('Caja demasiado grande'); return [lo, hi]; };
        if (op.op === 'place' || op.op === 'fill') {
          const t = keyFor(String(op.block)), f = FACING[op.facing] || 's';
          const [lo, hi] = op.op === 'place' ? [[op.x, op.y, op.z], [op.x, op.y, op.z]] : box(op.from, op.to);
          for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { at.set(`${x},${y},${z}`, { x, y, z, t, f }); n++; }
        } else if (op.op === 'remove') {
          const [lo, hi] = box(op.from, op.to);
          for (const k of [...at.keys()]) { const [x, y, z] = k.split(',').map(Number); if (x >= lo[0] && y >= lo[1] && z >= lo[2] && x <= hi[0] && y <= hi[1] && z <= hi[2]) { at.delete(k); n++; } }
        } else if (op.op === 'note') {
          const b = at.get(`${op.x},${op.y},${op.z}`);
          if (b) { b.gui = { title: m.P[b.t]?.n || b.t, settings: [String(op.text).slice(0, 400)] }; n++; }
        } else throw new Error(`Operación desconocida: ${op.op}`);
      }
      m.BLOCKS = [...at.values()];
      const xs = m.BLOCKS.map(b => b.x), zs = m.BLOCKS.map(b => b.z), ys = m.BLOCKS.map(b => b.y);
      if (m.BLOCKS.length) { m.W = m.WX = Math.max(...xs) + 1; m.WZ = Math.max(...zs) + 1; m.H = Math.max(...ys) + 1; }
      ctx.design = encode(m);
      ctx.saveDesign(ctx.design);
      const v = validateModel(m);
      return brief({ changed: n, blocks: m.BLOCKS.length, errors: v.errors.slice(0, 10), warnings: v.warnings.slice(0, 5) });
    }
    case 'validate_design': return brief(validateModel(decode(ctx.design)));
    case 'set_process': {
      const g = args.graph;
      if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.edges)) throw new Error('El grafo necesita nodes y edges');
      const ids = new Set(g.nodes.map(n => n.id));
      for (const e of g.edges) if (!ids.has(e.from) || !ids.has(e.to) || !(e.perUnit >= 0 || e.rate >= 0)) throw new Error(`Arista no válida (falta perUnit o rate): ${JSON.stringify(e).slice(0, 200)}`);
      if (JSON.stringify(g).length > 200_000) throw new Error('Grafo demasiado grande');
      const sol = solve(g);                                                     // el mismo cálculo que el simulador
      const m = decode(ctx.design); m.PROCESS = g; ctx.design = encode(m); ctx.saveDesign(ctx.design);
      const out = sol.edges.find(e => e.output) || sol.edges.at(-1), bott = sol.nodes.find(n => n.id === sol.bottleneck);
      return `Grafo guardado: ${g.nodes.length} nodos, ${g.edges.length} aristas.` + (sol.through != null
        ? ` Salida: ${+(out.rate * (out.fluid ? 1 : 60)).toFixed(2)} ${out.fluid ? 'mB/s' : '/min'}. Limita: ${bott?.id ?? 'ninguno'}. Capacidad por paso (unidades/s): ${sol.nodes.filter(n => n.rate).map(n => `${n.id}=${+n.cap.toFixed(3)}`).join(', ')}.`
        : ' Sin perUnit en los nodos: se usan los caudales escritos.');
    }
    case 'web_search': {
      const q = String(args.query).slice(0, 200);
      if (SEARCH.brave) {
        const j = await (await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`, { headers: { 'x-subscription-token': SEARCH.brave, accept: 'application/json' } })).json();
        return brief((j.web?.results || []).map(x => ({ title: x.title, url: x.url, snippet: x.description })));
      }
      if (SEARCH.tavily) {
        const j = await (await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: SEARCH.tavily, query: q, max_results: 8 }) })).json();
        return brief((j.results || []).map(x => ({ title: x.title, url: x.url, snippet: x.content?.slice(0, 300) })));
      }
      return 'La búsqueda web no está configurada en este servidor. Pide al jugador enlaces concretos y usa fetch_url.';
    }
    case 'fetch_url': {
      const r = await safeFetch(String(args.url), { headers: { 'user-agent': 'BuildGolem research agent' } });
      const html = (await r.text()).slice(0, 400_000);
      return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 10_000);
    }
    case 'write_skill': writeSkill(ctx.workspaceId, String(args.mod), String(args.markdown)); return 'Skill guardada.';
    default: throw new Error(`Herramienta desconocida: ${name}`);
  }
}
