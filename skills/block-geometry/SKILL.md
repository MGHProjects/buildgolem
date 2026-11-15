---
name: block-geometry
description: Coordenadas, orientación (facing y lados), tamaño real de los bloques, multibloques y bloques con necesidades de entorno.
---
# Geometría real

## Coordenadas y orientación
- x crece hacia el este, z hacia el sur, y hacia arriba; enteros ≥ 0.
- `facing` = hacia dónde mira la cara frontal: north, south, east o west (por defecto south). Los bloques solo giran en horizontal. Ponlo en toda máquina y en todo lo que `get_block` marca `directional`.
- Izquierda y derecha de una máquina (config de lados de Mekanism) son las del jugador que la mira de frente:

| facing | izquierda | derecha | detrás |
|---|---|---|---|
| south | west | east | north |
| north | east | west | south |
| east | south | north | west |
| west | north | south | east |

- Las piezas de AE2 van en cualquiera de las 6 caras de una celda de cable, también up y down.

## Tamaño
- `get_block` da `size: [x, y, z]` medido del modelo y de los bounding blocks del mod. Un bloque de 2 de alto ocupa su celda y la de encima: no pongas nada encima.
- Mekanism con más de una celda: Isotopic Centrifuge y Solar Neutron Activator (2 de alto), Digital Miner (3 × 2 × 3), Seismic Vibrator (2 de alto), Modification Station (2 de alto).
- `validate_design` detecta solapes por tamaño real: arréglalos, no los ignores.

## Multibloques
- Respeta tamaños mínimos y máximos y qué bloques admite cada posición (marco, cara, interior). Si la skill del mod no lo dice, que lo compruebe el experto en mods.
- Verificados: SPS de Mekanism 7×7×7 con cada cara en octógono (las 4 esquinas de 3 bloques vacías); Thermal Evaporation 4×4 de base y 3-18 de alto, arriba abierta.

## Entorno
- Algunos bloques necesitan cielo (Solar Neutron Activator, paneles solares), agua cerca, un bloque concreto encima o una dimensión. Compruébalo antes de colocarlos bajo tierra.
