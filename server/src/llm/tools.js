// Herramientas de los agentes. Todas trabajan sobre datos reales: el workspace del diseño y el propio diseño.
import { solve } from '../../../engine/process.js';
import { reader } from '../workspace/reader.js';
import { readSkill, listSkills, writeSkill } from './catalog.js';
import { decode, encode } from '../design/format.js';
import { validateModel, occupancy, touching, isCableCell, isMachine, ACTS_ON, SIDE_NAME } from '../design/validate.js';
import { safeFetch } from '../security.js';
import { SEARCH } from '../config.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { wsDir } from '../workspace/importer.js';

const obj = (props, required = []) => ({ type: 'object', properties: props, required });
const S = d => ({ type: 'string', description: d }), N = d => ({ type: 'number', description: d }), XYZ = d => ({ type: 'array', items: { type: 'number' }, description: d });
const E = (values, d) => ({ type: 'string', enum: values, description: d });
// una operación de edit_design; con propiedades explícitas los modelos pequeños se equivocan mucho menos que con un objeto libre
const OP = obj({
  op: E(['place', 'fill', 'remove', 'part', 'note']), x: N('x'), y: N('y'), z: N('z'), from: XYZ('[x,y,z]'), to: XYZ('[x,y,z]'),
  block: S('id de bloque del modpack'), facing: E(['north', 'south', 'east', 'west'], 'hacia dónde mira la cara frontal'),
  cable: S('id de cable de AE2: la celda es un cable'), part: S('id de pieza de AE2'), side: E(['north', 'south', 'east', 'west', 'up', 'down'], 'cara de la celda de cable que toca lo que alimenta'), text: S('nota'),
}, ['op']);

export const TOOL_DEFS = {
  ask_user: { description: 'Pregunta al jugador (una sola ronda, todas las preguntas juntas, con opciones). Después termina tu turno.', parameters: obj({ questions: { type: 'array', items: obj({ question: S('pregunta'), options: { type: 'array', items: { type: 'string' } } }, ['question']) } }, ['questions']) },
  read_skill: { description: 'Carga una skill (conocimiento) por nombre.', parameters: obj({ name: S('nombre de la skill, p. ej. mods/mekanism') }, ['name']) },
  consult_agent: { description: 'Encarga una tarea a otro agente y devuelve su respuesta. El agente solo ve "task".', parameters: obj({ agent: E(['mod-expert', 'optimizer', 'designer', 'researcher', 'process-animator', 'validator', 'skill-writer']), task: S('brief completo: objetivo, condiciones, ids, cantidades, medidas y qué debe devolver') }, ['agent', 'task']) },
  search_blocks: { description: 'Busca bloques del modpack por texto (id o nombre).', parameters: obj({ query: S('texto'), mod: S('id del mod (opcional)') }, ['query']) },
  get_block: { description: 'Detalle de un bloque: tamaño real (celdas que ocupa), si es direccional y familia de tier.', parameters: obj({ id: S('id del bloque, ns:nombre') }, ['id']) },
  search_recipes: { description: 'Busca recetas reales (con cantidades) por salida, entrada, tipo o mod.', parameters: obj({ output: S('id (parcial) de la salida'), input: S('id (parcial) de una entrada'), type: S('tipo de receta'), mod: S('mod') }) },
  get_config: { description: 'Lee la config de un mod: sin "file" lista archivos; con "file" devuelve su texto.', parameters: obj({ mod: S('id del mod'), file: S('archivo (opcional)') }, ['mod']) },
  calc: { description: 'Calcula una expresión aritmética exacta (+ - * / ^ ( ) ceil floor min max round).', parameters: obj({ expr: S('expresión') }, ['expr']) },
  get_design: { description: 'Resumen: tamaño, paleta (clave → id), recuento y piezas AE2 [x,y,z,id,side]. Con box lista los bloques de esa caja como [x,y,z,clave,facing n/s/e/w] (máx. 400).', parameters: obj({ box: XYZ('opcional [x0,y0,z0,x1,y1,z1]') }) },
  edit_design: { description: 'Edita el diseño. Coordenadas enteras ≥ 0: x hacia el este, y hacia arriba, z hacia el sur; el lienzo crece solo. Las ops van en orden y si una falla las demás siguen (mira "failed" y "notes" en la respuesta). '
    + 'place {x,y,z,block,facing} · fill {from,to,block,facing} (caja llena) · remove {from,to} o {x,y,z} · part {x,y,z,side,part} · note {x,y,z,text} (configuración de la máquina). '
    + 'facing: hacia dónde mira la cara frontal (por defecto south). cable en place/fill: la celda es ese cable de AE2, tapado con fachadas de "block" o a la vista si no hay block; un cable nunca es block. '
    + 'part: pieza de AE2 en una cara de una celda de cable; proveedores, interfaces y buses van en la cara que TOCA la máquina (up/down si está encima o debajo).', parameters: obj({ ops: { type: 'array', items: OP } }, ['ops']) },
  validate_design: { description: 'Comprueba solapes por tamaño real, piezas AE2 mal puestas o que no tocan su máquina y bloques flotantes.', parameters: obj({}) },
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
const SIDE = { ...FACING, up: 'u', down: 'd', top: 'u', bottom: 'd', u: 'u', d: 'd' };
const AE2_CABLE = /^ae2:[a-z_]+_cable$/, PART_ID = /^(ae2|extendedae|expandedae|advanced_ae|appmek|megacells|merequester|appflux):[a-z0-9_]+$/;
// forma de bloque → su pieza de cable (los modelos piden a menudo la del bloque)
const PART_OF = { 'ae2:pattern_provider': 'ae2:cable_pattern_provider', 'ae2:interface': 'ae2:cable_interface', 'extendedae:ex_pattern_provider': 'extendedae:ex_pattern_provider_part', 'extendedae:ex_interface': 'extendedae:ex_interface_part' };
const xyz = (v, what) => {
  const p = (Array.isArray(v) ? v : []).map(Number);
  if (p.length !== 3 || p.some(n => !Number.isInteger(n) || n < 0 || n > 512)) throw new Error(`${what}: hacen falta 3 coordenadas enteras entre 0 y 512`);
  return p;
};

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
      const family = b.tier ? r.blocks.filter(x => x.tier?.family === b.tier.family).map(x => x.id) : undefined;
      return brief({ id: b.id, name: b.nameEs || b.name, size: b.size, offset: b.offset?.some(Boolean) ? b.offset : undefined, directional: !!b.facing, tier: b.tier?.tier, family });
    }
    case 'search_recipes': {
      const r = ws(), { output, input, type, mod } = args;
      const hits = r.recipes.filter(x => (!type || x.type.includes(type)) && (!mod || x.id.startsWith(mod + ':')) && (!output || x.out.some(o => o.includes(output))) && (!input || x.in.some(i => i.includes(input))));
      // sin el JSON (índices antiguos sin data/ en files.json) quedan al menos entradas y salidas
      return brief({ total: hits.length, items: hits.slice(0, 8).map(x => ({ id: x.id, type: x.type, recipe: r.json(x.path) ?? { in: x.in, out: x.out } })) });
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
        parts: m.TERMS?.length ? m.TERMS.filter(t => !box || inBox(t)).slice(0, 200).map(t => [t.x, t.y, t.z, m.P[t.t]?.id, SIDE_NAME[t.f]]) : undefined,
        blocks: box ? m.BLOCKS.filter(inBox).slice(0, 400).map(b => [b.x, b.y, b.z, b.t, b.f]) : undefined, process: m.PROCESS ? 'sí' : 'no' });
    }
    case 'edit_design': {
      const m = decode(ctx.design), r = ctx.workspaceId ? reader(ctx.workspaceId) : null, at = new Map(m.BLOCKS.map(b => [`${b.x},${b.y},${b.z}`, b]));
      const failed = [], notes = new Set(), undirected = new Set();
      const similar = id => {
        const w = id.split(':').pop().split('_').filter(x => x.length > 2);
        return (r?.blocks || []).map(b => [b.id, w.filter(x => b.id.includes(x)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([i]) => i);
      };
      const keyFor = id => {
        let k = Object.keys(m.P).find(k => m.P[k].id === id);
        if (k) return k;
        const blk = r?.blocks.find(b => b.id === id);
        if (!blk) {
          if (PART_ID.test(id) && /cable_|_part$|_bus$|terminal|_plane$/.test(id)) throw new Error(`${id} es una pieza de AE2, no un bloque: va con {op:"part",x,y,z,side,part} en una celda de cable`);
          const near = similar(id);
          throw new Error(`No existe ${id} en este modpack.${near.length ? ` Parecidos: ${near.join(', ')}` : ' Búscalo con search_blocks.'}`);
        }
        k = id.split(':')[1].slice(0, 24);
        while (m.P[k]) k += '_';
        m.P[k] = { n: blk.nameEs || blk.name, id, model: blk.model, yaw: blk.yaw, size: blk.size, offset: blk.offset, tier: blk.tier || undefined, dir: blk.facing || undefined };
        return k;
      };
      // cable de AE2 a la vista (sin fachada): en el visor, un poste de fluix como el cable de los diseños de ejemplo
      const cableKey = () => {
        let k = Object.keys(m.P).find(k => m.P[k].id === 'ae2:cable_bus' && m.P[k].shape === 'post');
        if (k) return k;
        for (k = 'ae2_cable'; m.P[k]; k += '_');
        m.P[k] = { n: 'Cable de AE2', id: 'ae2:cable_bus', all: 'ae2:fluix_block', shape: 'post' };
        return k;
      };
      // pieza de cable (es un objeto, no un bloque): en el visor se dibuja como una placa con la textura de su forma de bloque
      const partKey = id => {
        let k = Object.keys(m.P).find(k => m.P[k].id === id);
        if (k) return k;
        const form = id.replace(':cable_', ':').replace(/_part$/, ''), blk = r?.blocks.find(b => b.id === form);
        k = 'p_' + id.split(':')[1].slice(0, 22);
        while (m.P[k]) k += '_';
        m.P[k] = { n: `${blk?.nameEs || blk?.name || id} (panel)`, id, panel: blk ? form : id };
        return k;
      };
      m.TERMS = m.TERMS || [];
      // los modelos pequeños mandan a veces una sola op, ops como texto JSON o el nombre de la op en otra clave
      let ops = args.ops ?? (args.op ? [args] : []);
      if (typeof ops === 'string') try { ops = JSON.parse(ops); } catch { throw new Error('ops tiene que ser una lista de objetos'); }
      if (!Array.isArray(ops)) ops = [ops];
      const box = (a, b) => { const lo = a.map((v, i) => Math.min(v, b[i])), hi = a.map((v, i) => Math.max(v, b[i])); if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 50_000) throw new Error('Caja demasiado grande (máx. 50 000 celdas)'); return [lo, hi]; };
      const within = (lo, hi) => ({ x, y, z }) => x >= lo[0] && y >= lo[1] && z >= lo[2] && x <= hi[0] && y <= hi[1] && z <= hi[2];
      let n = 0;
      ops.slice(0, 2000).forEach((op, i) => {
        const kind = op?.op ?? op?.type ?? op?.action;
        try {
          const one = () => { const p = xyz(op.at ?? op.pos ?? [op.x, op.y, op.z], kind); return [p, p]; };
          if (kind === 'place' || kind === 'fill') {
            let block = op.block ? String(op.block) : null, cable = op.cable ? String(op.cable) : null;
            if (block && (block === 'ae2:cable_bus' || AE2_CABLE.test(block))) { cable ||= block === 'ae2:cable_bus' ? 'ae2:fluix_glass_cable' : block; block = null; } // un cable no es un bloque
            if (!block && !cable) throw new Error('falta block');
            if (cable && !AE2_CABLE.test(cable)) throw new Error(`cable: solo cables de AE2 (ae2:fluix_glass_cable, ae2:fluix_covered_cable, ae2:fluix_covered_dense_cable…), no ${cable}`);
            const f = op.facing ? FACING[String(op.facing).toLowerCase()] : 's';
            if (!f) throw new Error(`facing "${op.facing}" no válido: north, south, east o west`);
            const t = block ? keyFor(block) : cableKey();
            if (!op.facing && m.P[t].dir && !undirected.has(t)) { undirected.add(t); notes.add(`${block} es direccional y va sin facing, así que su frente mira al sur. Si debe mirar a otro lado, vuelve a colocarlo con facing.`); }
            // cable tapado: la celda se ve como "block" y se exporta como ese cable con fachadas de "block" en las caras libres
            const col = cable?.slice(4).replace(/_(glass|covered|smart).*$/, '');
            const extra = cable ? { cable: true, cid: cable, col: col === 'fluix' ? undefined : col } : {};
            const [lo, hi] = kind === 'place' ? one() : box(xyz(op.from, 'from'), xyz(op.to, 'to'));
            for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { at.set(`${x},${y},${z}`, { x, y, z, t, f, ...extra }); n++; }
            if (!cable) m.TERMS = m.TERMS.filter(t => !within(lo, hi)(t)); // un bloque macizo se come las piezas que había en esa celda
          } else if (kind === 'remove') {
            const [lo, hi] = op.from ? box(xyz(op.from, 'from'), xyz(op.to ?? op.from, 'to')) : one(), inside = within(lo, hi);
            for (const [k, b] of [...at.entries()]) if (inside(b)) { at.delete(k); n++; }
            m.TERMS = m.TERMS.filter(t => !inside(t));
          } else if (kind === 'part') {
            const raw = String(op.part ?? op.block ?? ''), id = PART_OF[raw] || raw, f = SIDE[String(op.side ?? op.facing ?? '').toLowerCase()];
            if (!PART_ID.test(id)) throw new Error(`part: ${raw} no es una pieza de AE2 ni de sus addons`);
            if (!f) throw new Error('part: side tiene que ser north, south, east, west, up o down: la cara de la celda que toca lo que alimenta');
            const [[x, y, z]] = one();
            if (!isCableCell(m, at.get(`${x},${y},${z}`))) throw new Error(`part: en ${x},${y},${z} no hay cable de AE2; ponlo antes con {op:"place",x:${x},y:${y},z:${z},cable:"ae2:fluix_glass_cable"} (con block para taparlo)`);
            m.TERMS = m.TERMS.filter(t => !(t.x === x && t.y === y && t.z === z && t.f === f));
            m.TERMS.push({ x, y, z, t: partKey(id), f });
            if (raw !== id) notes.add(`${raw} es la forma de bloque; como pieza de cable se usa ${id}`);
            n++;
          } else if (kind === 'note') {
            const [[x, y, z]] = one(), b = at.get(`${x},${y},${z}`);
            if (!b) throw new Error(`note: no hay ningún bloque en ${x},${y},${z}`);
            b.gui = { title: m.P[b.t]?.n || b.t, settings: [String(op.text).slice(0, 400)] }; n++;
          } else throw new Error(`op desconocida "${kind}": place, fill, remove, part o note`);
        } catch (e) { failed.push({ i, op: kind, error: e.message }); }
      });
      m.BLOCKS = [...at.values()];
      // un panel que empuja (proveedor, interfaz, bus) mirando al aire o a otro cable no hace nada: si una sola cara libre
      // de su celda toca una máquina, se gira hacia ella; si hay varias o ninguna, lo dice validateModel con los lados posibles
      const owner = occupancy(m);
      for (const t of m.TERMS) {
        if (!ACTS_ON.test(m.P[t.t]?.id)) continue;
        const near = touching(m, owner, t);
        if (near.some(([f]) => f === t.f)) continue;
        const pick = near.filter(([f, b]) => isMachine(m.P[b.t]) && !m.TERMS.some(o => o !== t && o.x === t.x && o.y === t.y && o.z === t.z && o.f === f));
        if (pick.length !== 1) continue;
        notes.add(`${m.P[t.t].id} en ${t.x},${t.y},${t.z}: por ${SIDE_NAME[t.f]} no tocaba ninguna máquina; girado a ${SIDE_NAME[pick[0][0]]}, donde está ${m.P[pick[0][1].t].id}`);
        t.f = pick[0][0];
      }
      const xs = m.BLOCKS.map(b => b.x), zs = m.BLOCKS.map(b => b.z), ys = m.BLOCKS.map(b => b.y);
      if (m.BLOCKS.length) { m.W = m.WX = Math.max(...xs) + 1; m.WZ = Math.max(...zs) + 1; m.H = Math.max(...ys) + 1; }
      ctx.design = encode(m);
      ctx.saveDesign(ctx.design);
      const v = validateModel(m);
      return brief({ changed: n, blocks: m.BLOCKS.length, size: [m.WX, m.H, m.WZ], failed: failed.length ? failed.slice(0, 20) : undefined, notes: notes.size ? [...notes].slice(0, 12) : undefined,
        errors: v.errors.slice(0, 10), errorCount: v.errorCount > 10 ? v.errorCount : undefined, warnings: v.warnings.slice(0, 5) });
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
