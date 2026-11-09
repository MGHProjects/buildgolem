---
name: skill-authoring
description: Plantilla para escribir la skill de un mod a partir de los datos del workspace.
---
# Plantilla de skill de mod

```markdown
---
name: mods/<modid>
description: <una línea: qué automatiza el mod y para qué lo consultan los agentes>
---
# <Nombre del mod> (<versión del jar>)

## Máquinas
| Bloque | Tamaño | Qué hace | Tiers |

## Recetas clave
Una línea por tipo de receta, con un ejemplo real y sus cantidades.

## Reglas de lados y transporte

## Multibloques
Forma, tamaños mínimo y máximo, qué va en cada posición.

## Configuración que cambia números
`archivo` → `clave` = valor.

## Por confirmar
Lo que no sale de los datos.
```

Todo lo que no salga de una herramienta va en "Por confirmar".
