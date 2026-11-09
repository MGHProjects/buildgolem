// Mundo: los bloques de un diseño en una rejilla (índices, grupos que se ocultan, partes y piezas P2P por celda).
// Un diseño exporta P, BLOCKS, ZONES, W, H y, si quiere, WX/WZ, WALLS, TERMS (partes en celdas de cable), FIBER, CHANNELS, PIT…
export const STEP = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] };
export const key = (x, y, z) => `${x},${y},${z}`;

export function createWorld(M) {
  const { P, BLOCKS, W, H } = M;
  const TERMS = M.TERMS ?? [], FIBER = M.FIBER ?? [], CHANNELS = M.CHANNELS ?? { P2P: [], zones: {}, carriers: [] };
  const WX = M.WX ?? W, WZ = M.WZ ?? W, WB = M.WALLS ?? { x0: 0, x1: W - 1, z0: 0, z1: W - 1, top: H - 1 };
  // variantes de luz del pozo (Centro AE2): mismas posiciones que las End Rods; la ×2 añade un segundo tramo hacia el centro
  const ALT = [];
  for (const b of BLOCKS) if (b.t === 'fix') {
    const [ax, az] = STEP[b.f];
    ALT.push({ ...b, t: 'bar', tag: 'L_bar' }, { ...b, x: b.x + ax, z: b.z + az, t: 'bar', tag: 'L_bar2' });
    b.tag = 'L_end';
  }
  const GB = BLOCKS.concat(ALT), ALL = GB.concat(TERMS); // las partes van en la celda de su cable, no ocupan una propia
  const AT = new Map(BLOCKS.map(b => [key(b.x, b.y, b.z), b]));
  const P2PAT = new Map(), TERMAT = new Map(), TERMF = new Set();
  for (const p of CHANNELS.P2P) (P2PAT.get(key(p.x, p.y, p.z)) ?? P2PAT.set(key(p.x, p.y, p.z), []).get(key(p.x, p.y, p.z))).push(p);
  for (const t of TERMS) {
    const k = key(t.x, t.y, t.z), [dx, dz] = STEP[t.f];
    (TERMAT.get(k) ?? TERMAT.set(k, []).get(k)).push(t);
    TERMF.add(`${k},${dx},0,${dz}`); // en esa cara no hay fachada: va la pantalla
  }
  const Y0 = Math.min(...GB.map(b => b.y)), NY = Math.max(...GB.map(b => b.y)) - Y0 + 1, NC = WX * WZ * NY;
  const idx = (x, y, z) => x < 0 || z < 0 || x >= WX || z >= WZ || y < Y0 || y >= Y0 + NY ? -1 : ((y - Y0) * WZ + z) * WX + x;
  const TERMCELL = new Set(TERMS.map(t => idx(t.x, t.y, t.z)));
  const groupOf = b => b.tag || (b.x === WB.x0 ? 'W' : b.x === WB.x1 ? 'E' : b.z === WB.z0 ? 'N' : b.z === WB.z1 ? 'S' : b.y === WB.top ? 'ceil' : 'int');
  const isCable = b => b.cable || b.t === 'dcable';
  const colOf = b => b.col || 'white';
  // grupos que se ocultan según la cámara: paredes que dan hacia ella y techo si está fuera y por encima
  function wallsHidden(c, auto) {
    const inside = c.x > WB.x0 && c.x < WB.x1 + 1 && c.z > WB.z0 && c.z < WB.z1 + 1 && c.y < WB.top + 1;
    return { W: auto && c.x < WB.x0 + 1, E: auto && c.x > WB.x1, N: auto && c.z < WB.z0 + 1, S: auto && c.z > WB.z1, ceil: auto && !inside && c.y > WB.top };
  }
  return { M, P, BLOCKS, TERMS, FIBER, CHANNELS, WX, WZ, WB, ALT, GB, ALL, AT, P2PAT, TERMAT, TERMF, TERMCELL, Y0, NY, NC, idx, groupOf, isCable, colOf, wallsHidden };
}
