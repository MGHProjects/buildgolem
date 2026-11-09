---
name: json-protocol
description: Protocolo de respuesta para modelos sin llamadas a herramientas nativas. Una acción por mensaje, en JSON.
---
# Protocolo JSON

Si no puedes llamar herramientas de forma nativa, responde con **un único objeto JSON** y nada más:

```json
{"tool": "search_blocks", "args": {"query": "purifying factory"}}
```

o, cuando hayas terminado:

```json
{"answer": "Texto final para el jugador."}
```

Reglas:
- Una sola acción por mensaje. Espera el resultado antes de la siguiente.
- Sin texto antes ni después del JSON, sin comentarios, comillas dobles.
- Si el resultado de una herramienta es un error, corrige los argumentos y vuelve a intentarlo una vez.
- Pasos cortos: mejor tres llamadas pequeñas que una enorme.
