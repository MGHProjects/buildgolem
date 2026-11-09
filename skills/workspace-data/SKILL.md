---
name: workspace-data
description: Cómo usar las herramientas del workspace para obtener bloques, recetas y configs reales sin inventar nada.
---
# Datos del workspace

El workspace es el modpack exacto del jugador: sus jars, sus configs y sus scripts.

| Herramienta | Para qué | Truco |
|---|---|---|
| `search_blocks(query, mod?)` | Encontrar ids de bloque | Busca en inglés y en el idioma del jugador; filtra por mod (`mekanism`, `ae2`) |
| `get_block(id)` | Tamaño real, texturas, familia de tier | Si `size` no es 1×1×1, ese bloque ocupa más de una celda |
| `search_recipes(output?, input?, type?, mod?)` | Recetas reales con cantidades | Para máquinas, filtra por `type` (`mekanism:dissolution`) |
| `get_config(mod, key?)` | Valores que dependen de la config | Velocidades, energía, tiers, límites |
| `calc(expr)` | Cuentas exactas | Nunca hagas cuentas de memoria |

Reglas:
1. Un id que no devuelve una herramienta no existe para este modpack. No lo uses.
2. Las recetas pueden cambiar por KubeJS o CraftTweaker: la que devuelve `search_recipes` es la buena aunque no coincida con la wiki.
3. Cita el id exacto (`mekanism:ultimate_purifying_factory`) cuando hables de un bloque.
4. Si una cifra viene de la config, di de qué archivo y clave.
