// Familias de tier dentro de un diseño: tipos de la paleta cuyo id lleva una palabra de tier (basic … ultimate, y los de mekmm).
// solo los 4 tiers comunes de Mekanism: "dense" o "quantum" aparecen en ids que no son tiers (ae2:fluix_covered_dense_cable)
export const TIERS = ['basic', 'advanced', 'elite', 'ultimate'];
const RE = new RegExp(`(^|_|/|:)(${TIERS.join("|")})(_|/|$)`);

// procesos en paralelo por tier, comprobados en Mekanism 10.7 (factorías) y Mekanism More Machines
export const PARALLEL = { basic: 3, advanced: 5, elite: 7, ultimate: 9 };

export const tierOf = id => id?.split(':')[1]?.match(RE)?.[2] || null;
export const swapTier = (s, to) => s.replace(RE, (_, a, __, b) => `${a}${to}${b}`);

// familias presentes: { familyKey: { label, types: [t], tier } }
export function families(P, available = TIERS) {
  const out = {};
  for (const [t, s] of Object.entries(P)) {
    const tier = tierOf(s.id);
    if (!tier) continue;
    const fam = swapTier(s.id, 'TIER');
    (out[fam] ??= { label: s.n.replace(/\s*·\s*(Basic|Advanced|Elite|Ultimate)$/i, ''), types: [], tier, options: available }).types.push(t);
  }
  return out;
}

// cambia todos los tipos de una familia a otro tier: id, nombre y modelo (las factorías de Mekanism llevan el tier en la ruta del modelo)
export function applyTier(P, fam, to) {
  for (const t of fam.types) {
    const s = P[t];
    s.id = swapTier(s.id, to);
    if (typeof s.model === 'string') s.model = swapTier(s.model, to);
    for (const k of ['all', 'side', 'top', 'bottom', 'front', 'back', 'glow']) if (typeof s[k] === 'string') s[k] = swapTier(s[k], to);
    s.n = s.n.replace(/(Basic|Advanced|Elite|Ultimate)$/i, to[0].toUpperCase() + to.slice(1));
  }
  fam.tier = to;
}
