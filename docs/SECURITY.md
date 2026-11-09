# Seguridad

| Tema | Medida |
|---|---|
| Contraseñas | scrypt (N=32768, r=8, p=1, sal de 16 bytes), comparación en tiempo constante, mínimo 10 caracteres |
| Sesiones | token aleatorio de 32 bytes; en la base solo su SHA-256; cookie `HttpOnly`, `Secure`, `SameSite=Lax`, 30 días; rotación al entrar; cierre borra la sesión |
| CSRF | toda petición que cambia datos exige `Origin` de la propia app y la cabecera `X-BuildGolem: 1` (fuerza preflight); `SameSite=Lax` |
| Fuerza bruta | límite por IP y por email en registro y entrada (10 intentos / 15 min), errores genéricos |
| Claves de IA | AES-256-GCM con la clave maestra del servidor (`CRAFTOMETRY_MASTER_KEY`), el id de usuario como dato autenticado; nunca vuelven al navegador (solo los 4 últimos caracteres) |
| Tokens personales | `cmt_` + 32 bytes; se guarda su SHA-256; se enseñan una vez; ámbitos `read` / `write`; revocables |
| SSRF | las URLs de proveedor personalizado y las del agente investigador deben ser https públicas: se resuelve el DNS y se rechazan IPs privadas, loopback y link-local; sin redirecciones a privadas |
| Subidas | trozos de 50 MB con offset comprobado, cuota por usuario, solo `.zip` / `.mrpack` / `.jar`; los zips se leen con rutas normalizadas (sin `..`, sin absolutas) |
| Cabeceras | CSP sin inline scripts, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` |
| Privacidad | diseños privados por defecto; los públicos no exponen el email del autor |
| Auditoría | entradas, claves creadas/borradas, tokens creados/revocados, cambios de visibilidad |

| Email | verificación por enlace de un solo uso (24 h) y contraseña olvidada (1 h); en la base solo queda el sha256 del enlace; la respuesta de "olvidé" es la misma exista o no la cuenta; cambiar la contraseña cierra todas las sesiones; publicar en la galería exige email verificado |
| Google y Discord | OAuth 2 con `state` en cookie HttpOnly de 10 min (y PKCE en Google); solo se une a una cuenta existente si el proveedor confirma el email; si esa cuenta no estaba verificada se anulan su contraseña y sus sesiones (evita la cuenta preparada de antemano por otro); `next` solo admite rutas propias |

| Mod de Minecraft | vínculo por código de dispositivo: el mod nunca ve la contraseña; el código (8 caracteres sin vocales, 10 min, solo en memoria) se confirma en la web con sesión; el token resultante es de solo lectura, sale una sola vez y se revoca en Ajustes |
| Sesiones | "mantener la sesión": cookie de 60 días con renovación deslizante (como mucho una escritura al día); si no, cookie de navegador y 12 h sin actividad |
| Retención | cada día se borran sesiones y enlaces caducados y el registro de seguridad de más de 12 meses; exportación de datos sin secretos desde Ajustes |
| Licencias de texturas | solo los modId de `[[mods]]` heredan la licencia de su mods.toml; `minecraft` y `neoforge` nunca son públicos |

Pendiente antes de abrir al público: 2FA opcional y revisión legal de privacidad y términos.
