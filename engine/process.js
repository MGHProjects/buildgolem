// Cálculo del proceso de una fábrica, sin 3D (lo usan el visor, el servidor y los tests).
//
// Grafo (PROCESS de un diseño, o lo que escribe el agente animador):
//   nodes: [{ id, label, t?, at: [x,y,z] | [[x,y,z]…], count?, parallel?, factory?, ticks? | perTick?, perUnit?, upgrades? }]
//   edges: [{ from, to, item, color?, fluid?, perUnit? | rate?, path? | paths?, output? }]
//   upgrades: mejoras de velocidad por máquina (0–8) · supply: tope de entrada (unidades/s) · unit: qué es 1 unidad
// Con perUnit (operaciones o cantidad por unidad de entrada) el caudal se calcula; sin él se usa el rate escrito.

// Mekanism 10.7 (MekanismUtils.getTicks): ticks = base · M^(−mejoras/8), M = maxUpgradeMultiplier de config/Mekanism/general.toml (16).
// Las máquinas "por tick" (Chemical Washer y su factoría) hacen 2^mejoras operaciones por tick (baselineMaxOperations).
export const MAX_UPGRADES = 8;
export const list = at => (!at ? [] : Array.isArray(at[0]) ? at : [at]);

export function machineRate(n, { parallel = n.parallel ?? 1, upgrades = 0, mult = 16 } = {}) {
  const count = n.count ?? Math.max(1, list(n.at).length);
  if (n.perTick) return { count, parallel, perTick: n.perTick * 2 ** upgrades, cycle: 1 / 20, ops: count * parallel * n.perTick * 2 ** upgrades * 20 };
  if (!n.ticks) return null;
  const ticks = Math.max(1, Math.floor(n.ticks * mult ** (-upgrades / MAX_UPGRADES)));
  return { count, parallel, ticks, cycle: ticks / 20, ops: count * parallel * 20 / ticks };
}

// resuelve el grafo: capacidad de cada paso en unidades de entrada por segundo; la línea va al ritmo del más lento
export function solve(graph, { parallelOf = () => null, upgrades = graph?.upgrades ?? 0 } = {}) {
  if (!graph?.nodes?.length) return null;
  const real = graph.nodes.some(n => n.perUnit != null);
  const nodes = graph.nodes.map(n => {
    const base = n.parallel ?? 1, par = parallelOf(n) ?? base;
    const rate = machineRate(n, { parallel: par, upgrades: n.upgrades === false ? 0 : upgrades });
    return { ...n, parallel: par, factor: par / base, rate, cap: rate && n.perUnit ? rate.ops / n.perUnit : Infinity };
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  if (!real) { // grafo con caudales escritos a mano: se escalan con el paralelismo de sus extremos
    const edges = graph.edges.map(e => ({ ...e, rate: (e.rate || 0) * Math.min(byId.get(e.from)?.factor ?? 1, byId.get(e.to)?.factor ?? 1) }));
    return { ...graph, nodes, edges, upgrades, through: null, saturated: [], bottleneck: graph.bottleneck };
  }
  const through = Math.min(graph.supply ?? Infinity, ...nodes.map(n => n.cap));
  for (const n of nodes) n.load = Number.isFinite(n.cap) && Number.isFinite(through) ? through / n.cap : 0;
  const limited = nodes.filter(n => Number.isFinite(n.cap));
  const bott = limited.reduce((a, n) => (!a || n.cap < a.cap - 1e-9 ? n : a), null);
  const edges = graph.edges.map(e => ({ ...e, rate: e.perUnit != null && Number.isFinite(through) ? through * e.perUnit : (e.rate || 0) }));
  // con un solo paso que limita no hay "cuello de botella": es la máquina, sin más
  return { ...graph, nodes, edges, upgrades, through, bottleneck: limited.length > 1 ? bott?.id : null, saturated: limited.filter(n => n.load > .999).map(n => n.id) };
}

