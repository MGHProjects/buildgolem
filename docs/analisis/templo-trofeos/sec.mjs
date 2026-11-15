// corte vertical del mundo en memoria: plano x = X (z horizontal) o z = Z (x horizontal)
export function section(w, { x = null, z = null, y0 = 0, y1 = 30, a0 = 0, a1 = 40 }) {
  const ch = c => { if (!c) return '.'; const id = c.id, s = c.state || {};
    if (/_stairs$/.test(id)) { const f = s.facing?.[0]; const sh = s.shape && s.shape !== 'straight' ? 'o' : ''; return sh || (s.half === 'top' ? { north: 'n', south: 's', east: 'e', west: 'w' }[s.facing] : { north: 'N', south: 'S', east: 'E', west: 'W' }[s.facing]); }
    if (/_slab$/.test(id)) return s.type === 'top' ? '▀' : '▄';
    if (/log|stem/.test(id)) return '|'; if (/calcite/.test(id)) return '░'; if (/gold/.test(id)) return 'G'; if (/tiles/.test(id)) return '#'; return '█'; };
  const out = [];
  for (let y = y1; y >= y0; y--) { let r = String(y).padStart(3) + ' '; for (let a = a0; a <= a1; a++) r += ch(x != null ? w.get(x, y, a) : w.get(a, y, z)); out.push(r); }
  return out.join('\n');
}
