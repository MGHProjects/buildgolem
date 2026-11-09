"""Copia desde los jars de la instancia las texturas que usa diseno.js -> visor/texturas/,
y resuelve los modelos de bloque (P[].model) -> visor/modelos.json (elementos con sus caras y texturas).
Uso: python -I extraer_texturas.py "<carpeta instancia ATM10A>" "<minecraft 1.21.1.jar>"   (necesita node)
"""
import sys, json, zipfile, pathlib, subprocess

here = pathlib.Path(__file__).parent
inst, vanilla = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
# todos los diseños del visor (Centro AE2, granja de hierro, red P2P y sala Mekanism) comparten texturas/ y modelos.json
js = ("Promise.all(['./diseno.js','./granja.js','./p2p.js','./mekanism.js'].map(f=>import(f))).then(ms=>console.log(JSON.stringify({tex:ms.flatMap(m=>Object.values(m.P).flatMap(p=>"
      "[p.all,p.side,p.top,p.bottom,p.front,p.back,typeof p.glow==='string'?p.glow:p.glow?.front].filter(Boolean)).concat(m.EXTRA_TEX)),"
      "models:ms.flatMap(m=>Object.values(m.P).map(p=>p.model).filter(Boolean))})))")
need = json.loads(subprocess.run(["node", "-e", js], cwd=here, capture_output=True, text=True, check=True).stdout)
keys = set(need["tex"])
jars = [zipfile.ZipFile(j) for j in [vanilla, *sorted((inst / "mods").glob("*.jar"))]]
files = {}
for z in jars:
    for n in z.namelist(): files.setdefault(n, z)

# ── modelos: sigue la cadena de "parent", une variables de textura y se queda con los elementos ──
def load(ref):
    ns, path = (ref if ":" in ref else "minecraft:" + ref).split(":")
    return json.loads(files[f"assets/{ns}/models/{path}.json"].read(f"assets/{ns}/models/{path}.json"))
def resolve(ref):
    m = load(ref) if isinstance(ref, str) else ref
    if m.get("loader") == "neoforge:composite":  # factorías de Mekanism: varias piezas (base + LED), cada una con su modelo
        return [e for c in m["children"].values() for e in resolve(c)]
    texvars, elements = {}, None
    while True:
        texvars = {**m.get("textures", {}), **texvars}   # el hijo manda
        elements = elements or m.get("elements")
        if "parent" not in m or m["parent"].split(":")[-1] in ("block/block", "block/thin_block"): break
        m = load(m["parent"])
    def tex(v):
        while v.startswith("#"): v = texvars[v[1:]]
        ns, path = (v if ":" in v else "minecraft:" + v).split(":")
        assert path.startswith(("block/", "part/", "item/")), f"textura fuera de block/, part/ e item/: {v}"
        return f"{ns}:{path[6:] if path.startswith('block/') else path}"
    for e in elements:
        for f in e["faces"].values(): f["texture"] = tex(f["texture"])
    return elements
models = {}
for ref in need["models"]:  # una lista = varios modelos superpuestos (partes AE2: base + pantalla + LED)
    refs = ref if isinstance(ref, list) else [ref]
    els = models["+".join(refs)] = [e for r in refs for e in resolve(r)]
    keys |= {f["texture"] for e in els for f in e["faces"].values()}
(here / "modelos.json").write_text(json.dumps(models), encoding="utf-8")

def src(k):
    ns, path = k.split(":")
    return f"assets/{ns}/textures/{path if path.startswith(('part/', 'item/')) else 'block/' + path}.png"
want = {src(k): k for k in keys}
out = here / "texturas"
for n in list(want):
    if n not in files: continue
    z = files[n]; ns, path = want.pop(n).split(":")
    dst = out / ns / f"{path}.png"
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(z.read(n))
    if n + ".mcmeta" in files:  # datos de animación (frametime, interpolate, frames)
        (dst.parent / (dst.name + ".mcmeta")).write_bytes(files[n + ".mcmeta"].read(n + ".mcmeta"))
for n in list(want):  # texturas de KubeJS (Universal Press de ATM10): en la carpeta kubejs/ de la instancia, no en un jar
    f = inst / "kubejs" / n
    if f.exists():
        ns, path = want.pop(n).split(":")
        dst = out / ns / f"{path}.png"; dst.parent.mkdir(parents=True, exist_ok=True); dst.write_bytes(f.read_bytes())
print(len(keys) - len(want), "texturas,", len(models), "modelos; faltan:", sorted(want.values()))
