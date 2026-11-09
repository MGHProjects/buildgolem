// Configuración por variables de entorno. Sin CRAFTOMETRY_MASTER_KEY el servidor no arranca: cifra las claves de IA de los usuarios.
import { resolve } from 'node:path';

const env = process.env;
export const PORT = +(env.PORT || 8099);
export const HOST = env.HOST || '127.0.0.1';
export const PUBLIC_URL = (env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
export const DATA_DIR = resolve(env.DATA_DIR || 'data');
export const WEB_DIR = resolve(env.WEB_DIR || '../web/dist');
export const ROOT_DIR = resolve(env.ROOT_DIR || '..');                // agents/ y skills/
export const SECURE_COOKIES = PUBLIC_URL.startsWith('https://');
export const ALLOWED_ORIGINS = new Set([PUBLIC_URL, ...(env.EXTRA_ORIGINS || '').split(',').filter(Boolean)]);
export const REDIRECT_HOSTS = new Set((env.REDIRECT_HOSTS || '').toLowerCase().split(',').filter(Boolean));   // dominios antiguos: sus páginas redirigen a PUBLIC_URL
export const MASTER_KEY = env.CRAFTOMETRY_MASTER_KEY ? Buffer.from(env.CRAFTOMETRY_MASTER_KEY, 'base64') : null;
export const CURSEFORGE_API_KEY = env.CURSEFORGE_API_KEY || '';
export const SEARCH = { brave: env.BRAVE_SEARCH_KEY || '', tavily: env.TAVILY_KEY || '' };
export const QUOTA_BYTES = +(env.QUOTA_BYTES || 6 * 1024 ** 3);       // 6 GB de workspaces por usuario
export const CHUNK_BYTES = 50 * 1024 ** 2;                            // el túnel de Cloudflare corta a 100 MB por petición
export const AGENT_MAX_STEPS = +(env.AGENT_MAX_STEPS || 14);
// correo (Resend): sin clave, los enlaces de verificación y de contraseña se escriben en el log del servidor
export const RESEND_API_KEY = env.RESEND_API_KEY || '';
export const MAIL_FROM = env.MAIL_FROM || 'BuildGolem <no-reply@dualix.io>';
// entrar con Google o Discord: cada uno se activa al poner su client id y secret
export const OAUTH = {
  google: { id: env.GOOGLE_CLIENT_ID || '', secret: env.GOOGLE_CLIENT_SECRET || '' },
  discord: { id: env.DISCORD_CLIENT_ID || '', secret: env.DISCORD_CLIENT_SECRET || '' },
};

export function assertConfig() {
  if (!MASTER_KEY || MASTER_KEY.length !== 32) throw new Error('Falta CRAFTOMETRY_MASTER_KEY (32 bytes en base64). Genera una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
}
