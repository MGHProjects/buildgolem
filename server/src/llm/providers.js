// Proveedores de IA: catálogo (con su opción gratuita) y un cliente con dos protocolos, OpenAI-compatible y Anthropic.
import { safeFetch, assertPublicUrl } from '../security.js';

// free: cómo conseguir acceso gratis (revisado 2026-11; los límites cambian a menudo)
export const PROVIDERS = {
  gemini: { name: 'Google Gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', protocol: 'openai', models: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    keyUrl: 'https://aistudio.google.com/apikey', free: { es: 'Gratis en Google AI Studio con cuenta de Google. Los prompts del plan gratis pueden usarse para mejorar sus productos.', en: 'Free in Google AI Studio with a Google account. Free-tier prompts may be used to improve their products.' } },
  groq: { name: 'Groq', base: 'https://api.groq.com/openai/v1', protocol: 'openai', models: ['openai/gpt-oss-120b', 'moonshotai/kimi-k2-instruct'],
    keyUrl: 'https://console.groq.com/keys', free: { es: 'Plan gratis con límites por modelo (peticiones por minuto y por día). Muy rápido.', en: 'Free plan with per-model limits (requests per minute and per day). Very fast.' } },
  openrouter: { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1', protocol: 'openai', models: ['openai/gpt-oss-120b:free', 'deepseek/deepseek-chat-v3.1:free'],
    keyUrl: 'https://openrouter.ai/keys', free: { es: 'Modelos terminados en :free: 50 peticiones al día, 1000 si has comprado 10 $ de crédito alguna vez.', en: 'Models ending in :free: 50 requests a day, 1,000 once you have bought $10 of credit.' } },
  mistral: { name: 'Mistral', base: 'https://api.mistral.ai/v1', protocol: 'openai', models: ['mistral-medium-latest', 'mistral-small-latest'],
    keyUrl: 'https://console.mistral.ai/api-keys', free: { es: 'Plan "Experiment" gratis tras verificar el teléfono, con límites bajos.', en: 'Free "Experiment" plan after phone verification, with low limits.' } },
  anthropic: { name: 'Anthropic Claude', base: 'https://api.anthropic.com/v1', protocol: 'anthropic', models: ['claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-opus-5-5'],
    keyUrl: 'https://console.anthropic.com/settings/keys', free: null },
  openai: { name: 'OpenAI', base: 'https://api.openai.com/v1', protocol: 'openai', models: ['gpt-5-mini', 'gpt-5'],
    keyUrl: 'https://platform.openai.com/api-keys', free: null },
  deepseek: { name: 'DeepSeek', base: 'https://api.deepseek.com/v1', protocol: 'openai', models: ['deepseek-chat', 'deepseek-reasoner'],
    keyUrl: 'https://platform.deepseek.com/api_keys', free: null },
  custom: { name: 'Compatible con OpenAI', base: '', protocol: 'openai', models: [],
    keyUrl: null, free: { es: 'Cualquier servicio compatible con la API de OpenAI y accesible por https (por ejemplo, tu Ollama detrás de un túnel).', en: 'Any OpenAI-compatible service reachable over https (for example, your Ollama behind a tunnel).' } },
};

export async function resolveBase(provider, baseUrl) {
  const p = PROVIDERS[provider];
  if (!p) throw new Error('Proveedor desconocido');
  if (provider !== 'custom') return p.base;
  await assertPublicUrl(baseUrl);
  return baseUrl.replace(/\/$/, '');
}

// mensajes internos: {role: system|user|assistant|tool, content, toolCalls?: [{id, name, args}], toolCallId?, name?}
// devuelve {text, toolCalls: [{id, name, args}], usage}
export async function chat({ provider, apiKey, baseUrl, model, messages, tools, signal }) {
  const p = PROVIDERS[provider], base = await resolveBase(provider, baseUrl);
  return p.protocol === 'anthropic' ? anthropicChat(base, apiKey, model, messages, tools, signal) : openaiChat(base, apiKey, model, messages, tools, signal);
}

async function call(url, headers, payload, signal) {
  const r = await safeFetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(payload), signal: signal || AbortSignal.timeout(120_000) });
  const text = await r.text();
  if (!r.ok) throw new Error(`El proveedor respondió ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function openaiChat(base, key, model, messages, tools, signal) {
  const msgs = messages.map(m => m.role === 'tool' ? { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
    : m.toolCalls?.length ? { role: 'assistant', content: m.content || null, tool_calls: m.toolCalls.map(t => ({ id: t.id, type: 'function', function: { name: t.name, arguments: JSON.stringify(t.args) } })) }
    : { role: m.role, content: m.content });
  const payload = { model, messages: msgs };
  if (tools?.length) payload.tools = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
  const j = await call(`${base}/chat/completions`, { authorization: `Bearer ${key}` }, payload, signal);
  const m = j.choices?.[0]?.message || {};
  return { text: m.content || '', usage: j.usage,
    toolCalls: (m.tool_calls || []).map(t => ({ id: t.id, name: t.function.name, args: safeJson(t.function.arguments) })) };
}

async function anthropicChat(base, key, model, messages, tools, signal) {
  const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const out = [];
  for (const m of messages.filter(m => m.role !== 'system')) {
    if (m.role === 'tool') {
      const block = { type: 'tool_result', tool_use_id: m.toolCallId, content: m.content };
      const last = out.at(-1);
      if (last?.role === 'user' && Array.isArray(last.content) && last.content.every(b => b.type === 'tool_result')) last.content.push(block);
      else out.push({ role: 'user', content: [block] });
    } else if (m.toolCalls?.length) out.push({ role: 'assistant', content: [...(m.content ? [{ type: 'text', text: m.content }] : []), ...m.toolCalls.map(t => ({ type: 'tool_use', id: t.id, name: t.name, input: t.args }))] });
    else out.push({ role: m.role, content: m.content });
  }
  const payload = { model, max_tokens: 4096, system, messages: out };
  if (tools?.length) payload.tools = tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters }));
  const j = await call(`${base}/messages`, { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, payload, signal);
  return { text: (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n'), usage: j.usage,
    toolCalls: (j.content || []).filter(b => b.type === 'tool_use').map(b => ({ id: b.id, name: b.name, args: b.input || {} })) };
}

export function safeJson(s) {
  if (s && typeof s === 'object') return s;
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}
// protocolo JSON para modelos sin herramientas: saca el primer objeto JSON equilibrado del texto
export function extractJson(text) {
  const s = String(text);
  for (let i = s.indexOf('{'); i >= 0; i = s.indexOf('{', i + 1)) {
    let depth = 0, inStr = false, esc = false;
    for (let j = i; j < s.length; j++) {
      const ch = s[j];
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true; else if (ch === '{') depth++; else if (ch === '}' && --depth === 0) {
        try { return JSON.parse(s.slice(i, j + 1)); } catch { break; }
      }
    }
  }
  return null;
}
