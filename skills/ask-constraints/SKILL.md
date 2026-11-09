---
name: ask-constraints
description: Qué preguntar al jugador antes de diseñar, porque cambia el diseño entero. Una sola ronda de preguntas.
---
# Preguntas que cambian el diseño

Pregunta solo lo que falte, todo en una llamada a `ask_user`, con opciones cerradas cuando se pueda y una recomendada.

| Tema | Por qué cambia todo | Opciones típicas |
|---|---|---|
| Energía | Generarla añade reactores, turbinas o paneles y mucho espacio | La traigo yo (cable / ender) · La genera la instalación · Mixta |
| Red de objetos | Una red propia necesita controlador y almacenamiento; conectarse a la suya solo entradas | Red propia · Me conecto a mi red AE2/RS · Sin red |
| Espacio | Manda en la distribución | Medidas exactas (ancho × fondo × alto) · Libre |
| Ubicación | Hay máquinas que necesitan cielo o una dimensión concreta | Superficie · Bajo tierra · Otra dimensión |
| Entradas por dónde | Dónde llegan cables y tuberías | Por abajo · Por los lados · Por arriba |
| Progresión | Qué tiers puede fabricar ya | Inicial · Media · Final (máximo tier) |
| Objetivo | Cuánto tiene que producir | Caudal (x/min) · "Lo máximo que quepa" |
| Estilo | Decoración | Del mismo mod · Industrial · Libre |

Reglas:
- Si el jugador ya lo dijo, no lo preguntes.
- Máximo 4 preguntas por ronda; agrupa las menos importantes en "lo dejo a tu criterio".
- Tras la respuesta, repite en una línea las condiciones que vas a usar.
