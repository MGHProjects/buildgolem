// Simula la red AE2 del diseño con las reglas sacadas de los .jar del pack (AE2 19.2.17, ExtendedAE 2.2.35):
// · dos bloques/cables pegados se conectan si los dos exponen esa cara y el color es igual o uno es transparente
// · una parte (P2P, terminal) en una cara corta el cable por esa cara; las fachadas NO cortan nada
// · capacidad: nodo denso 32, resto 8, controlador sin límite; algoritmo de canales = PathingCalculation de AE2
// Uso: node verificar_red.mjs
import { P, BLOCKS, CHANNELS, TERMS, FIBER } from './diseno.js';

const D = { d: [0, -1, 0], u: [0, 1, 0], n: [0, 0, -1], s: [0, 0, 1], w: [-1, 0, 0], e: [1, 0, 0] };
const OPP = { d: 'u', u: 'd', n: 's', s: 'n', w: 'e', e: 'w' };
const ALL = Object.keys(D);
const dirOf = v => ALL.find(k => D[k].every((c, i) => c === v[i]));
const key = (x, y, z) => `${x},${y},${z}`;

// propiedades de red por tipo de bloque (flags y caras leídos de los .class)
const mb = g => ({ req: 1, mb: g });
const DEV = {
  ctrl: { root: 1, dense: 1 },
  drive: { req: 1, sides: 'noFront' }, iop: { req: 1 }, exif: { req: 1 }, expp: { req: 1 },
  masm: {}, emcell: {}, react: {}, insc: { sides: 'noFront' }, chg: { sides: 'noFront' }, crya: { sides: 'noFront' }, cut: { sides: 'noFront' },
  grow: { sides: 'frontBack' },
  cu: mb('cpu'), cstore: mb('cpu'), cacc: mb('cpu'), cmon: mb('cpu'),
  qshell: mb('qc'), qcore: mb('qc'), qstore: mb('qc'), qacc: mb('qc'), qthr: mb('qc'), qent: mb('qc'),
  amfr: mb('am'), amgl: mb('am'), amcr: mb('am'), ampa: mb('am'), amsp: mb('am'),
  qring: { dense: 1, ring: 1 }, qlink: { dense: 1, ring: 1 },
  wconn: { dense: 1, color: 'white' }, whub: { dense: 1, color: 'white' },
  req: { req: 1 },   // ME Requester: REQUIRE_CHANNEL (require_channel = true en la config del pack), conecta por todas las caras
  mebr: { req: 1 },  // ME Bridge de Advanced Peripherals: "uses one channel"
};
for (const k of Object.keys(P)) if (k.startsWith('hub_')) DEV[k] = { dense: 1, color: k.slice(4), remote: 1 };

const nodes = [], cell = new Map();
const node = o => { const n = { id: nodes.length, conns: [], ...o }; nodes.push(n); return n; };
const conns = [];
const link = (a, b, tag) => { const c = { a, b, tag, isConn: 1 }; a.conns.push(c); b.conns.push(c); conns.push(c); };

// 1. nodos por celda
for (const b of BLOCKS) {
  let o = null;
  if (b.cable) o = { kind: 'cable', dense: 1, color: b.col || 'white', role: b.cable };
  else if (b.t === 'dcable') o = { kind: 'cable', dense: 1, color: 'white', role: 'z' };
  else if (DEV[b.t]) o = { kind: 'dev', color: 'transparent', ...DEV[b.t] };
  if (!o) continue;
  let sides = ALL;
  if (o.sides === 'noFront') sides = ALL.filter(s => s !== b.f);
  if (o.sides === 'frontBack') sides = [b.f, OPP[b.f]];
  cell.set(key(b.x, b.y, b.z), node({ ...o, b, t: b.t, sides: new Set(sides), parts: {} }));
}
// anillos cuánticos: las esquinas no conectan (QuantumBridgeBlockEntity.isCorner)
for (const n of nodes) if (n.t === 'qring' && !ALL.some(f => cell.get(key(n.b.x + D[f][0], n.b.y + D[f][1], n.b.z + D[f][2]))?.t === 'qlink')) n.sides = new Set();

// 2. partes: P2P (nodo en la red del cable + nodo exterior hacia la cara) y terminales
const p2pOuter = [];
for (const p of CHANNELS.P2P) {
  const c = cell.get(key(p.x, p.y, p.z)), f = dirOf(p.d);
  if (!c) throw new Error(`P2P sin cable en ${p.x},${p.y},${p.z}`);
  c.parts[f] = 'p2p';
  const inner = node({ kind: 'part', what: `P2P ${p.io} (${p.zone})`, req: 1, at: p });
  link(c, inner, 'bus');
  const outer = node({ kind: 'p2pout', dense: 1, color: 'transparent', sides: new Set([f]), at: p, b: { x: p.x, y: p.y, z: p.z } });
  p2pOuter.push({ outer, p, f });
}
for (const f of FIBER) cell.get(key(f.x, f.y, f.z)).parts[dirOf(f.d)] = 'fibra'; // solo pasa energía: ocupa la cara, no une redes
for (const t of TERMS) {
  const c = cell.get(key(t.x, t.y, t.z));
  if (!c) throw new Error(`Terminal sin cable en ${t.x},${t.y},${t.z}`);
  c.parts[t.f] = 'term';
  link(c, node({ kind: 'part', what: `${P[t.t].n.split(' · ')[0]}`, req: 1, at: t }), 'bus');
}

// 3. conexiones en el mundo
const compat = (a, b) => a.color === 'transparent' || b.color === 'transparent' || a.color === b.color;
const exposes = (n, f) => n.sides.has(f) && !(n.kind === 'cable' && n.parts[f]);
for (const a of cell.values()) for (const f of ['u', 's', 'e']) {
  const [dx, dy, dz] = D[f], b = cell.get(key(a.b.x + dx, a.b.y + dy, a.b.z + dz));
  if (b && exposes(a, f) && exposes(b, OPP[f]) && compat(a, b)) link(a, b, 'mundo');
}
for (const { outer, p, f } of p2pOuter) {
  const [dx, dy, dz] = D[f], b = cell.get(key(p.x + dx, p.y + dy, p.z + dz));
  if (b && b.sides.has(OPP[f]) && !(b.kind === 'cable' && b.parts[OPP[f]])) link(outer, b, 'mundo');
}

// 4. enlaces inalámbricos: quioscos -> hub del tronco; conectores del techo -> conectores remotos del cubo grande
const hub = nodes.find(n => n.t === 'whub');
for (const n of nodes) if (n.t === 'wconn') link(n, hub, 'wifi');
const tops = nodes.filter(n => n.remote);
const nIn = CHANNELS.nOut; // 1 entrada P2P por salida (así cada salida tiene sus 32 canales)
tops.forEach((n, i) => {
  const r = node({ kind: 'remoto', dense: 1, color: n.color, what: `conector remoto ${i}` });
  link(n, r, 'wifi');
  const k = node({ kind: 'cable', dense: 1, color: n.color, what: 'cable del cubo grande', parts: {} });
  link(r, k, 'mundo');
  for (let j = i; j < nIn; j += tops.length) link(k, node({ kind: 'part', what: 'P2P entrada (cubo grande)', req: 1 }), 'bus');
});

// 5. raíces de la red principal: cada salida P2P cuelga de su entrada (32) junto al controlador grande
for (const { outer, p } of p2pOuter) {
  const v = node({ kind: 'dev', root: 1, main: 1, what: 'controlador grande' });
  const inp = node({ kind: 'p2pin', dense: 1, what: `entrada de ${p.zone}` });
  link(v, inp, 'mundo'); link(inp, outer, 'túnel');
}

// 6. componentes (redes)
const comp = new Map();
let nc = 0;
for (const n of nodes) {
  if (comp.has(n)) continue;
  const st = [n]; comp.set(n, nc);
  while (st.length) { const m = st.pop(); for (const c of m.conns) { if (c.tag === 'túnel') continue; const o = c.a === m ? c.b : c.a; if (!comp.has(o)) { comp.set(o, nc); st.push(o); } } }
  nc++;
}
const members = i => nodes.filter(n => comp.get(n) === i);

// multibloques: grupos por contacto entre piezas del mismo tipo
const grp = new Map();
for (const n of nodes) if (n.mb && !grp.has(n)) {
  const st = [n], g = []; grp.set(n, g); g.push(n);
  while (st.length) { const m = st.pop(); for (const f of ALL) { const [dx, dy, dz] = D[f], o = cell.get(key(m.b.x + dx, m.b.y + dy, m.b.z + dz)); if (o?.mb === n.mb && !grp.has(o)) { grp.set(o, g); g.push(o); st.push(o); } } }
}

// 7. algoritmo de canales de AE2 (PathingCalculation + GridNode.setControllerRoute)
const DIR_ORDER = { d: 0, u: 1, n: 2, s: 3, w: 4, e: 5 };
const maxCh = n => (n.dense ? 32 : 8);
function pathing(roots) {
  const q = [[], [], []], visited = new Set(), used = new Map(), got = new Set(), mbWith = new Set();
  const enqueue = (it, lvl) => { visited.add(it); q[Math.max(it.isConn ? 0 : it.dense ? 0 : 2, lvl)].push(it); };
  const route = (it, from) => {
    if (it.isConn) { it.route = from; return; }
    const par = from.route;
    if (par.root) { it.hsa = null; it.sub = maxCh(it); return; }
    it.hsa = par.hsa == null ? par : par.sub === par.hsa.sub ? par.hsa : par;
    it.sub = Math.min(par.sub, maxCh(it));
  };
  const tryUse = n => {
    for (let a = n; a; a = a.hsa) if ((used.get(a) || 0) >= maxCh(a)) return false;
    for (let a = n; a; a = a.hsa) used.set(a, (used.get(a) || 0) + 1);
    got.add(n); return true;
  };
  for (const r of roots) { visited.add(r); for (const c of r.conns) { const o = c.a === r ? c.b : c.a; if (!o.root) { c.route = r; enqueue(c, 0); } } }
  for (let lvl = 0; lvl < 3; lvl++) while (q[lvl].length) {
    const it = q[lvl].shift();
    const opts = it.isConn ? [it.a, it.b] : it.conns;
    for (const o of opts) {
      if (visited.has(o)) continue;
      route(o, it);
      if (o.req && !mbWith.has(o) && tryUse(o) && o.mb) for (const m of grp.get(o)) if (m !== o) mbWith.add(m);
      enqueue(o, lvl);
    }
  }
  return { got, used, mbWith };
}

// 8. informe
const subId = comp.get(nodes.find(n => n.t === 'ctrl'));
const sub = members(subId);
const where = n => n.b ? `${n.b.x},${n.b.y},${n.b.z}` : '';
const label = n => n.what || (n.kind === 'cable' ? `cable ${n.color}${n.role === 'c' ? ' (portador)' : ''}` : P[n.t]?.n || n.t);
const errs = [], warns = [];

console.log(`\n== Subred del controlador del techo: ${sub.length} nodos`);
const foreign = sub.filter(n => (n.kind === 'cable' && n.role === 'z') || (n.kind === 'dev' && !['ctrl'].includes(n.t) && !n.remote) || (n.kind === 'part' && !/^P2P/.test(n.what)) || n.kind === 'p2pout');
const harmless = foreign.filter(n => n.t === 'emcell'), bad = foreign.filter(n => n.t !== 'emcell');
for (const n of bad) errs.push(`SUBRED MEZCLADA: ${label(n)} en ${where(n)} está unido a la red del controlador del techo`);
if (harmless.length) warns.push(`${harmless.length} MEGA Energy Cells tocan un cable portador: están en la subred (no en la red principal)`);
const loose = tops.filter(n => comp.get(n) !== subId);
for (const n of loose) errs.push(`Conector del techo ${P[n.t].n} en ${where(n)} NO llega al controlador (solo toca conectores de otro color)`);

const sp = pathing(sub.filter(n => n.root));
const subReq = sub.filter(n => n.req);
const subMiss = subReq.filter(n => !sp.got.has(n));
console.log(`   P2P en la subred: ${subReq.length} (salidas ${CHANNELS.nOut} + entradas por los conectores del techo), sin canal: ${subMiss.length}`);
for (const n of subMiss) errs.push(`Sin canal en la subred: ${n.what} ${n.at ? `${n.at.x},${n.at.y},${n.at.z}` : ''}`);
const topsIn = tops.filter(n => comp.get(n) === subId);
console.log(`   conectores del techo unidos al controlador: ${topsIn.length}/${tops.length}`);

console.log(`\n== Red principal (por zonas)`);
const mainIds = [...new Set(nodes.filter(n => n.kind !== 'remoto' && comp.get(n) !== subId && (n.req || n.kind === 'cable')).map(n => comp.get(n)))];
const roots = nodes.filter(n => n.root && n.main);
const mp = pathing(roots);
for (const id of mainIds) {
  const ms = members(id), req = ms.filter(n => n.req);
  if (!req.length && !ms.some(n => n.kind === 'cable')) continue;
  const outs = ms.filter(n => n.kind === 'p2pout');
  const zones = [...new Set(outs.map(n => n.at.zone))];
  const has = n => mp.got.has(n) || (n.mb && grp.get(n).some(m => mp.got.has(m)));
  const miss = req.filter(n => !has(n));
  const units = new Set(req.map(n => (n.mb ? grp.get(n) : n)));
  const missU = new Set(miss.map(n => (n.mb ? grp.get(n) : n)));
  const name = zones.join('+') || `sin P2P (${label(ms[0])} ${where(ms[0])})`;
  console.log(`   ${name}: ${outs.length} salidas, ${units.size} dispositivos con canal requerido, sin canal: ${missU.size}`);
  if (!outs.length && req.length) errs.push(`Red aislada sin salida P2P: ${req.length} piezas (p.ej. ${label(req[0])} en ${where(req[0])})`);
  else for (const u of missU) { const n = Array.isArray(u) ? u[0] : u; errs.push(`${name}: ${label(n)} en ${where(n) || (n.at ? `${n.at.x},${n.at.y},${n.at.z}` : '')} se queda sin canal`); }
}
console.log(`\n== Avisos (${warns.length})`); warns.forEach(w => console.log('   · ' + w));
console.log(`\n== Errores (${errs.length})`); errs.forEach(e => console.log('   ✗ ' + e));
process.exitCode = errs.length ? 1 : 0;
