// Bucle de agentes con un modelo simulado: herramientas nativas y protocolo JSON (modelos sin herramientas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

Object.assign(process.env, { DATA_DIR: mkdtempSync(join(tmpdir(), 'cm-ag-')), CRAFTOMETRY_MASTER_KEY: randomBytes(32).toString('base64'), ROOT_DIR: join(import.meta.dirname, '..', '..') });
const { runAgent } = await import('../src/llm/agent.js');
const { encode } = await import('../src/design/format.js');

const design = encode({ P: { s: { n: 'Piedra', id: 'minecraft:stone' } }, BLOCKS: [{ x: 0, y: 0, z: 0, t: 's' }] });
const ctx = (script, toolMode = 'native') => {
  let i = 0;
  return { key: { provider: 'groq', model: 'x', toolMode }, design, saveDesign() {}, lang: 'es', chat: async ({ messages }) => script[i++](messages) };
};

test('herramientas nativas: calc y respuesta final', async () => {
  const events = [];
  const r = await runAgent('optimizer', [{ role: 'user', content: '¿cuántas factorías?' }], ctx([
    () => ({ text: '', toolCalls: [{ id: 't1', name: 'calc', args: { expr: 'ceil(100/9)' } }] }),
    msgs => ({ text: `Hacen falta ${msgs.at(-1).content} factorías.`, toolCalls: [] }),
  ]), e => events.push(e));
  assert.equal(r.text, 'Hacen falta 12 factorías.');
  assert.ok(events.some(e => e.type === 'tool' && e.name === 'calc'));
});

test('protocolo JSON: corrige un formato roto y usa una herramienta', async () => {
  const r = await runAgent('optimizer', [{ role: 'user', content: 'calcula' }], ctx([
    () => ({ text: 'creo que son 12', toolCalls: [] }),                                       // sin JSON → se le pide formato
    () => ({ text: 'Vale: {"tool": "calc", "args": {"expr": "3*3"}}', toolCalls: [] }),
    msgs => ({ text: `{"answer": "${msgs.at(-1).content.split(': ')[1]}"}`, toolCalls: [] }),
  ], 'json'), () => {});
  assert.equal(r.text, '9');
});

test('un agente no puede usar herramientas que no tiene', async () => {
  const results = [];
  await runAgent('researcher', [{ role: 'user', content: 'x' }], ctx([
    () => ({ text: '', toolCalls: [{ id: 'a', name: 'edit_design', args: { ops: [] } }] }),
    () => ({ text: 'fin', toolCalls: [] }),
  ]), e => e.type === 'result' && results.push(e.text));
  assert.match(results[0], /no puede usar edit_design/);
});

test('ask_user corta el turno y devuelve las preguntas', async () => {
  const r = await runAgent('orchestrator', [{ role: 'user', content: 'una sala de mekanism' }], ctx([
    () => ({ text: '', toolCalls: [{ id: 'q', name: 'ask_user', args: { questions: [{ question: '¿De dónde sale la energía?', options: ['La traigo yo', 'La genera la sala'] }] } }] }),
  ]), () => {});
  assert.equal(r.asked[0].question, '¿De dónde sale la energía?');
});
