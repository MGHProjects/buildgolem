---
name: block-geometry
description: Tamaño real de los bloques, multibloques, orientación y bloques con necesidades de entorno.
---
# Geometría real

## Tamaño
- `get_block` devuelve `size: [x, y, z]` medido del modelo y de los bounding blocks del mod. Un bloque de 2 de alto ocupa su celda y la de encima: no pongas nada encima.
- Ejemplos de Mekanism con más de una celda: Isotopic Centrifuge y Solar Neutron Activator (2 de alto), Digital Miner (3 × 2 × 3), Seismic Vibrator (2 de alto), Modification Station (2 de alto).
- `validate_design` detecta colisiones por tamaño real: arréglalas, no las ignores.

## Orientación
- `facing` es hacia donde mira la cara frontal (`north`, `south`, `east`, `west`, y `up`/`down` si el bloque lo permite).
- Los lados de una máquina se nombran mirándola de frente: izquierda y derecha son las del jugador que la mira.

## Multibloques
- Respeta tamaños mínimos y máximos, y qué bloques admite cada posición (marco, cara, interior). Si la skill del mod no lo dice, pide al experto en mods que lo compruebe.
- Ejemplos verificados: SPS de Mekanism 7×7×7 con cada cara en octógono (las 4 esquinas de 3 bloques vacías); Thermal Evaporation 4×4 de base y 3-18 de alto, arriba abierta.

## Entorno
- Algunos bloques necesitan cielo (Solar Neutron Activator, paneles solares), agua cerca, un bloque concreto encima o una dimensión. Compruébalo antes de colocarlos bajo tierra.
