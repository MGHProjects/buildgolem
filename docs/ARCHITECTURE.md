# Arquitectura

```
web/        Vite + React + Tailwind v4 + GSAP. Landing, app, galería, guía de APIs gratis. es/en.
engine/     Motor 3D (three.js) del visor original: mundo, mallado con caché, picking, fichas AE2.
server/     Node 24 + Hono + node:sqlite. API, sesiones, claves cifradas, workspaces, agentes, exportación.
agents/     Definición de cada agente (markdown con cabecera): rol, herramientas y skills que puede cargar.
skills/     Conocimiento que los agentes cargan bajo demanda (por mod y por tarea).
docs/       Producto, arquitectura, seguridad, dirección de diseño.
```

## Flujo principal

1. **Workspace**: el usuario sube el zip de su instancia (en trozos de 50 MB, el túnel de Cloudflare corta a 100 MB por petición) o elige un modpack de Modrinth. El servidor guarda los jars tal cual, descarga el jar vanilla de su versión desde Mojang y crea un índice:
   - `blocks`: id, nombre (lang es/en), modelo resuelto, **tamaño real** (extremos de los elementos del modelo y lista de bounding blocks conocidos), texturas, familia de tier.
   - `recipes`: tipo, entradas y salidas normalizadas, para buscar por salida o por máquina.
   - `tags`, `configs` (los toml/json de `config/`), `files` (ruta → jar) para servir texturas leyendo el jar sin extraer todo.
2. **Diseño**: JSON versionado (`format: craftometry/1`) con paleta, bloques, partes, cámaras, fichas, patrones, grafo de proceso. El motor lo convierte al modelo del visor.
3. **Agentes**: el navegador abre un chat por diseño. El servidor ejecuta el bucle del agente con la clave del usuario: llamada al modelo → herramientas del workspace → resultado → siguiente paso. Cada evento sale por SSE.
4. **Exportar**: `.nbt` de estructura (Create Schematicannon, `/place template`), con la paleta del diseño.

## Proveedores de IA

Un adaptador con dos protocolos:
- **OpenAI-compatible** (`/chat/completions` con `tools`): OpenAI, Gemini (endpoint compatible), Groq, OpenRouter, Mistral, DeepSeek, Cerebras y cualquier URL compatible.
- **Anthropic** (`/v1/messages`).

Si el modelo no soporta llamadas a herramientas, el agente pasa al **protocolo JSON**: cada respuesta es un único objeto `{"tool": …, "args": …}` o `{"answer": …}`, se valida y, si falla, se corrige con un mensaje automático (máximo 2 reintentos).

## Datos

SQLite (`node:sqlite`) en `server/data/craftometry.db`:
`users`, `sessions`, `provider_keys`, `pats`, `workspaces`, `designs`, `chats`, `audit`.
Los archivos de cada workspace viven en `server/data/workspaces/<id>/`.
