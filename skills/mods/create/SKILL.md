---
name: mods/create
description: Create 6.x: rotación, estrés, cintas, procesado y esquemas. Lo que haya que comprobar en el workspace va marcado.
---
# Create 6.x

## Rotación y estrés
- Cada máquina consume estrés (SU) multiplicado por su velocidad (RPM); las fuentes dan capacidad de estrés. Si el consumo supera la capacidad, la red se para.
- Los valores exactos de SU dependen de la config (`create-server.toml`): léelos con `get_config(create)` antes de calcular.
- La velocidad (RPM) cambia con engranajes grandes/pequeños (×2 o ×0,5) y con cajas de cambio.

## Procesado
- Molino, trituradora, mezclador, prensa, horno con ventilador (lavado, ahumado, fundido) y depósitos. Las recetas reales salen de `search_recipes(type: create:*)`.
- Las cintas mueven pilas a velocidad proporcional a las RPM; los embudos y las cintas con filtro reparten.

## Esquemas
- La Schematicannon construye en survival un `.nbt` desde la carpeta `schematics/`, gastando los bloques de un cofre adyacente. Es la forma de llevar un diseño de BuildGolem al mundo sin mod propio.

## Por confirmar en cada workspace
- Consumo de estrés por máquina y capacidad de cada fuente (config).
- Recetas añadidas por addons y KubeJS.
