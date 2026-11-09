---
name: process-animation
description: Formato del grafo de proceso que el simulador calcula y anima sobre el diseño (tiempos reales, tiers, mejoras), y cómo sacar cada número.
---
# Grafo de proceso

El simulador no se fía de caudales escritos a mano: los **calcula** a partir de los tiempos de cada máquina y de cuánto trabajo hace falta por unidad. Tú das las recetas y los tiempos; él saca el caudal, el cuello de botella y la animación. Guarda el grafo con `set_process`: la respuesta te dice el caudal y el paso que limita.

```json
{
  "title": { "es": "4 líneas ×5", "en": "4 ×5 lines" },
  "unit": { "es": "crudo", "en": "raw ore" },
  "upgrades": 8,
  "nodes": [
    { "id": "bus", "label": "Tag Export Bus", "at": [[2, 1, 16], [40, 1, 16]] },
    { "id": "dis", "label": "Disolución", "t": "fdis", "factory": true, "parallel": 9, "ticks": 200, "perUnit": 0.3333,
      "at": [[2, 1, 17], [40, 1, 17]] },
    { "id": "was", "label": "Lavado", "t": "fwas", "factory": true, "parallel": 9, "perTick": 1, "perUnit": 666.67, "at": [[2, 1, 18], [40, 1, 18]] }
  ],
  "edges": [
    { "from": "bus", "to": "dis", "item": "Crudos", "color": "#c79a6b", "perUnit": 1,
      "paths": [[[2.62, 0.85, 16], [2.62, 0.85, 17]], [[39.38, 0.85, 16], [39.38, 0.85, 17]]] },
    { "from": "dis", "to": "was", "item": "Slurry sucio", "color": "#7a5636", "fluid": true, "perUnit": 666.67 }
  ],
  "notes": "El Tag Export Bus no se cuenta: ponle Acceleration Cards."
}
```

## Unidad y perUnit (lo importante)

- Elige **1 unidad** de lo que entra en la línea (1 crudo, 1 ciclo, 1 túnel) y escríbela en `unit`.
- En cada **nodo-máquina**, `perUnit` = operaciones que hacen falta por unidad. 3 crudos → 2000 mB en una operación: `perUnit = 1/3`. 200 mB de slurry → 1 cristal: con 2000/3 mB por crudo salen 10/3 cristales, así que `perUnit = 10/3`.
- En cada **arista**, `perUnit` = cantidad que pasa por unidad (objetos, o mB si `fluid: true`). Marca con `output: true` la arista del producto final: es la cifra grande del panel.
- Nodos sin `ticks` ni `perTick` (buses, almacenes, interfaces) no limitan: son origen, destino o paso.

## Tiempos de cada máquina

- `ticks`: ticks por operación (20 ticks = 1 s). `perTick`: máquinas continuas que hacen N operaciones por tick (lavadora de Mekanism: 1 mB/tick).
- `parallel`: operaciones a la vez dentro de la máquina (factoría Ultimate = 9). Con `factory: true` y `t` (tipo de la paleta), el simulador lo saca del tier del bloque, y si el jugador cambia el tier se recalcula todo.
- `count`: máquinas iguales; si `at` es una lista de posiciones, cuenta solas.
- `upgrades` (en el grafo): mejoras de velocidad de **Mekanism** por máquina, 0–8. Tiempo = base · 16^(−n/8) (maxUpgradeMultiplier de config/Mekanism/general.toml; léelo con `get_config`). Las "por tick" doblan con cada mejora. Pon `"upgrades": false` en nodos que no son de Mekanism.
- Saca cada tiempo de los datos del modpack, nunca de memoria: `search_recipes` para cantidades, `get_config` para multiplicadores; si un tiempo está solo en el código del mod y no lo puedes comprobar, no inventes: deja el nodo sin `ticks` y dilo en `notes`.

Tiempos comprobados en ATM10 (Mekanism 10.7, AE2 19.2, ExtendedAE 2.2, HNN 6.5):

| Máquina | Tiempo base | Mejoras |
|---|---|---|
| Factorías de Mekanism y de mekmm | 200 ticks | Speed Upgrade: ÷16 con 8 |
| Chemical Dissolution Chamber (sola) | 100 ticks | igual |
| Chemical Washer / Washing Factory | 1 mB/tick por proceso | ×2 por mejora |
| Inscriber, Crystal Assembler | 200 de progreso, +2/3/5/10/50 por tick con 0–4 Speed Cards | 4 cards → 4 ticks |
| Molecular Assembler | 100 de progreso, +10/13/17/20/25/50 con 0–5 Acceleration Cards | 0 cards → 10 ticks |
| HNN Data Center | 300 ticks por ciclo y modelo, 25 modelos | — |
| HNN Loot Fabricator | 60 ticks | — |

## Rutas (`path` / `paths`)

- Puntos `[x, y, z]` en coordenadas del diseño; el simulador suma 0,5 para ir por el centro de la celda. Usa decimales para pasar por delante de la cara de una máquina (x + 0,62) o por un cable.
- `paths` lleva una ruta por cada máquina repetida (una línea por cada copia). Sin rutas, une cada máquina con la más cercana del destino.
- Haz que el material vaya por donde va de verdad: por el cable de la red, por la tubería, o de cara a cara si son adyacentes.

## Qué enseña el simulador

Objetos (cubos del color de la arista) o fluidos (gotas) que viajan por cada ruta a un ritmo proporcional al caudal real, barra de progreso y pulso en cada máquina al terminar una operación, etiquetas con ciclo y carga, el cuello de botella en rojo, y un panel con el caudal de salida, la capacidad de cada paso y selectores de tier y mejoras que lo recalculan todo.
