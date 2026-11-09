# BuildGolem

Diseñador de fábricas y bases para modpacks de Minecraft, con agentes de IA que trabajan sobre los datos reales del modpack de cada usuario.

En producción: https://buildgolem.dualix.io (servicio `craftometry` en el servidor de casa, puerto 8099, túnel `minecraft-control`).

## Qué hay

| Carpeta | Contenido |
|---|---|
| `server/` | API (Node 24, Hono, node:sqlite): cuentas, claves de IA cifradas, tokens personales, workspaces, indexador de modpacks, agentes, exportación `.nbt` |
| `web/` | Landing (GSAP) y app (React, Tailwind 4), español e inglés, tema claro y oscuro |
| `engine/` | Motor 3D del visor original: mallado con caché, fichas tipo AE2, tiers, animación de procesos |
| `agents/` | 8 agentes: director, experto en mods, optimizador, diseñador, investigador, animador de procesos, validador, creador de skills |
| `skills/` | Conocimiento que los agentes cargan bajo demanda (preguntas clave, geometría real, matemáticas de fábrica, lados, Mekanism, AE2, Create…) |
| `seed/` | Los 4 diseños originales, publicados en la galería |
| `docs/` | Producto, arquitectura, seguridad, dirección de diseño |
| `mod/` | BuildGolem Link: mod de cliente para NeoForge 1.21.1 (vincular cuenta, holograma, capas, materiales). Ver `mod/README.md` |

## Desarrollo

```bash
cd server && npm install && npm test
```

```bash
cd web && npm install && npm run build
```

```bash
cd server && CRAFTOMETRY_MASTER_KEY=<32 bytes en base64> npm start
```

La semilla (`server/scripts/seed.js`) indexa el workspace de ejemplo desde `data/workspaces/atm10-demo/files` (mods, config y kubejs de ATM10) y carga los diseños de `seed/designs`.

## Correo y entrada con Google o Discord

Variables en `server/.env` (sin ellas la app funciona: los enlaces de correo salen en el log y no aparecen los botones):

| Variable | Para qué |
|---|---|
| `RESEND_API_KEY`, `MAIL_FROM` | Correos de verificación y de contraseña (por defecto `BuildGolem <no-reply@dualix.io>`; el dominio debe estar verificado en Resend) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Entrar con Google. URL de retorno: `https://buildgolem.dualix.io/api/auth/oauth/google/callback` |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Entrar con Discord. URL de retorno: `https://buildgolem.dualix.io/api/auth/oauth/discord/callback` |

## Plano de la landing

`node web/scripts/blueprint.mjs` regenera `web/src/landing/centro-ae2.json` (planta y alzado) desde `seed/designs/diseno.js`.

## Pendiente

- Probar BuildGolem Link dentro de ATM10 y publicar su descarga.
- Logo definitivo: el favicon actual es un marcador provisional.
- Revisión legal de privacidad, términos y del uso de texturas (hoy se enseñan en público solo las de mods con licencia libre según su `mods.toml`).
