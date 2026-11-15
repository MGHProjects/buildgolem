---
name: mods/powah
description: Powah 6.x (1.21.1): reactor multibloque de 36 bloques, generadores, energizado, celdas y cables FE. Datos del manual, la config y los data maps del jar.
---
# Powah 6.x

Tiers, de menos a más: starter, basic, hardened, blazing, niotic, spirited, nitro. El tier va en el id (`powah:reactor_nitro`, `powah:energy_cable_nitro`, `powah:energy_cell_nitro`…).

## Reactor (generador FE multibloque)
- **36 bloques de reactor del mismo tier en una caja de 3 × 3 de base y 4 de alto**; al completarse se forma solo. Un bloque suelto no hace nada. En `edit_design`: `{"op":"fill","from":[x,y,z],"to":[x+2,y+3,z+2],"block":"powah:reactor_nitro"}`.
- Combustible: `powah:uraninite` (100 de combustible por unidad). Refrigerante líquido: agua. Refrigerante sólido (mejor cuanto más frío): dry ice `powah:dry_ice` (-32), blue ice (-17), packed ice (-8), ice (-5), snow block (-3).
- FE/t base por reactor (config `powah.json5` → generators.reactors.generation_rates): starter 200 · basic 600 · hardened 1500 · blazing 5000 · niotic 15 000 · spirited 50 000 · nitro 140 000. Extracción máxima (transfer_rates): starter 1000 · basic 4000 · hardened 10 000 · blazing 40 000 · niotic 100 000 · spirited 400 000 · nitro 2 000 000 FE/t. El valor real lo calcula el reactor según temperatura y refrigerante.
- Sala de reactores: cada reactor ocupa 3 × 4 × 3; deja 1 bloque entre reactores para cables y tuberías, y un pasillo de 2 por delante. Entrada de uraninite y refrigerante (AE2 con Export Bus, tuberías…) y salida de energía con cables `powah:energy_cable_<tier>` hacia una celda `powah:energy_cell_<tier>` o hacia la red de energía del jugador.

## Otros generadores
- Thermo Generator: sobre un bloque caliente (magma 800, `powah:blazing_crystal_block` 2800, lava) y con un refrigerante líquido (agua).
- Magmator: quema fluidos calientes (lava). Furnator: combustible sólido de horno (carbón, madera…). En ambos, más tier = más FE/t con la misma energía por combustible.
- Solar Panel: necesita cielo; cualquier bloque encima corta la producción.

## Energizado
- Energizing Orb + al menos un Energizing Rod a su alcance (área de 9 × 9 alrededor del orbe). Los rods tienen que estar sobre cables o sobre un bloque de FE; la velocidad depende de cuántos rods haya y de su tier. El orbe no necesita energía.

## Almacenamiento y transporte
- Energy Cell: guarda FE; también añade capacidad a un canal de Ender Network desde la Ender Cell.
- Energy Cable por tier; el modo de cada cara se cambia con la llave de Powah.

## Por confirmar
- Por qué caras del reactor formado entran objetos y sale la energía. Si no lo sabes seguro, deja libres las caras laterales de la fila inferior para cables y tuberías y dilo en la nota de la máquina.
