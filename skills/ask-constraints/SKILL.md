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
| Estilo | Decoración | Del mismo mod · Industrial · Libre | Del mismo mod |

Reglas:
- No preguntes lo que ya dijo el jugador o se ve en el diseño.
- Una sola ronda. "(a tu criterio)", sin respuesta o "sigue" = usa la columna "Si no contesta".
- Después repite en una línea las condiciones que vas a usar y sigue trabajando.
