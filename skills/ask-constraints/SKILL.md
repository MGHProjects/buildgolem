---
name: ask-constraints
description: Qué preguntar al jugador antes de diseñar (una sola ronda) y qué suponer si no contesta.
---
# Condiciones del diseño

Pregunta solo lo que falte y cambie el diseño entero: una llamada a `ask_user`, máximo 4 preguntas, opciones cerradas y la recomendada primero.

| Tema | Por qué cambia todo | Opciones | Si no contesta |
|---|---|---|---|
| Energía | Generarla añade generadores y mucho espacio | La traigo yo · La genera la instalación · Mixta | La trae él: deja marcado el punto de entrada |
| Red de objetos | Una red propia necesita controlador y almacenamiento | Red propia · Me conecto a mi AE2/RS · Sin red | Se conecta a su AE2: deja marcada la entrada de la red |
| Espacio | Manda en la distribución | Medidas (ancho × fondo × alto) · Libre | Libre y compacto, con pasillos de 2 |
| Ubicación | Hay máquinas que necesitan cielo | Superficie · Bajo tierra · Otra dimensión | Superficie |
| Progresión | Qué tiers puede fabricar | Inicial · Media · Final | Final: el mejor tier que haya en el workspace |
| Objetivo | Cuánto produce | Caudal (x/min) · Lo máximo que quepa | Una línea completa de cada cadena pedida |
| Estilo | Decoración (fábricas) o arquitectura (edificios) | Fábricas: Del mismo mod · Industrial · Libre. Edificios: Japonés · Chino · Medieval · Moderno · Temático por mod | Fábricas: del mismo mod. Edificios: el que encaje con el tema; si hay varios mods, un estilo para el exterior y el tema de cada mod dentro |
| Tema (salas y decoración) | Paleta y objetos | Mods del tema · Vanilla · Libre | Los mods que nombró; si no, el del objeto principal |
| Objetos a exponer | Cuántos expositores | Lista · Los jefes del mod · Según las misiones · A tu criterio | Lo que marcan las misiones del pack (`search_quests`): jefes, armas, ingredientes de la meta final |

Reglas:
- No preguntes lo que ya dijo el jugador o se ve en el diseño.
- Una sola ronda. "(a tu criterio)", sin respuesta o "sigue" = usa la columna "Si no contesta".
- Después repite en una línea las condiciones que vas a usar y sigue trabajando.
