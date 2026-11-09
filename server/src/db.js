// Base de datos SQLite (node:sqlite). Esquema en una sola migración idempotente.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR } from './config.js';

mkdirSync(DATA_DIR, { recursive: true });
export const db = new DatabaseSync(process.env.DB_PATH || join(DATA_DIR, 'craftometry.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, handle TEXT UNIQUE NOT NULL,
  pass TEXT NOT NULL, lang TEXT NOT NULL DEFAULT 'es', created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created INTEGER NOT NULL, expires INTEGER NOT NULL, ip TEXT, ua TEXT
);
CREATE TABLE IF NOT EXISTS provider_keys (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, label TEXT NOT NULL, secret BLOB NOT NULL, last4 TEXT NOT NULL,
  base_url TEXT, model TEXT NOT NULL, tool_mode TEXT NOT NULL DEFAULT 'native', is_default INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pats (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, hash TEXT UNIQUE NOT NULL, scopes TEXT NOT NULL, created INTEGER NOT NULL, last_used INTEGER
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, source TEXT NOT NULL, source_ref TEXT, mc_version TEXT, loader TEXT,
  status TEXT NOT NULL, progress TEXT, error TEXT, bytes INTEGER NOT NULL DEFAULT 0, stats TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS designs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, summary TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public')),
  data TEXT NOT NULL, size TEXT, blocks INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS designs_public ON designs(visibility, updated);
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY, design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, messages TEXT NOT NULL, updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS email_tokens (
  hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('verify','reset')), email TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT, created INTEGER NOT NULL, PRIMARY KEY (provider, subject)
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL, ip TEXT, at INTEGER NOT NULL, meta TEXT
);
`);

// columnas añadidas después: se crean si faltan (la base de producción ya existe)
const cols = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
if (!cols.has('verified')) db.exec('ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0');
if (!db.prepare('PRAGMA table_info(sessions)').all().some(c => c.name === 'remember')) db.exec('ALTER TABLE sessions ADD COLUMN remember INTEGER NOT NULL DEFAULT 1');

export const one = (sql, ...a) => db.prepare(sql).get(...a);
export const all = (sql, ...a) => db.prepare(sql).all(...a);
export const run = (sql, ...a) => db.prepare(sql).run(...a);
export const audit = (userId, action, ip, meta) => run('INSERT INTO audit (user_id, action, ip, at, meta) VALUES (?, ?, ?, ?, ?)', userId, action, ip || null, Date.now(), meta ? JSON.stringify(meta) : null);
