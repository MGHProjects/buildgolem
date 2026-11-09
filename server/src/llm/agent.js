// Bucle de un agente: modelo → herramientas → resultados → siguiente paso, hasta respuesta final o el máximo de pasos.
// Con tool_mode "json" (modelos sin herramientas nativas) cada respuesta es un objeto {"tool","args"} o {"answer"}, con 2 reintentos.
import { chat, extractJson } from './providers.js';
import { getAgents, listSkills } from './catalog.js';
import { TOOL_DEFS, runTool } from './tools.js';
import { AGENT_MAX_STEPS } from '../config.js';

function systemPrompt(agent, ctx, json) {
  const skills = listSkills(ctx.workspaceId), allowed = agent.skills || [];
  const skillList = Object.entries(skills).filter(([k]) => allowed.includes(k) || k.startsWith('mods/')).map(([k, s]) => `- ${k}: ${s.description || ''}`).join('\n');
  const tools = (agent.tools || []).map(t => `- ${t}: ${TOOL_DEFS[t]?.description}`).join('\n');
  return [agent.prompt,
    `Idioma del jugador: ${ctx.lang === 'en' ? 'inglés' : 'español'}. Workspace: ${ctx.workspaceName || 'ninguno'}${ctx.mcVersion ? ` (Minecraft ${ctx.mcVersion})` : ''}.`,
    `Skills disponibles (cárgalas con read_skill antes de usarlas):\n${skillList}`,
    json ? `Herramientas (protocolo JSON, lee json-protocol):\n${tools}\n\nResponde SIEMPRE con un único objeto JSON: {"tool": "...", "args": {...}} o {"answer": "..."}.` : '',
  ].filter(Boolean).join('\n\n');
}

// emit(event): {type: 'step'|'tool'|'result'|'text'|'ask'|'error'|'done', ...}
export async function runAgent(agentName, history, ctx, emit, depth = 0) {
  const agent = getAgents()[agentName];
  if (!agent) throw new Error(`Agente desconocido: ${agentName}`);
  const json = ctx.key.toolMode === 'json', tools = (agent.tools || []).filter(t => TOOL_DEFS[t]).map(t => ({ name: t, ...TOOL_DEFS[t] }));
  const messages = [{ role: 'system', content: systemPrompt(agent, ctx, json) }, ...history];
  let asked = null, retries = 0;
  const sub = {
    ...ctx,
    onAsk: q => { asked = q; emit({ type: 'ask', agent: agentName, questions: q }); },
    runAgent: async (name, task) => {
      if (depth >= 2) return 'No se pueden encadenar más de 2 niveles de agentes.';
      emit({ type: 'step', agent: name, text: task.slice(0, 200) });
      const r = await runAgent(name, [{ role: 'user', content: task }], ctx, emit, depth + 1);
      return r.text || '(sin respuesta)';
    },
  };
  for (let step = 0; step < AGENT_MAX_STEPS; step++) {
    if (ctx.signal?.aborted) throw new Error('Cancelado');
    const r = await (ctx.chat || chat)({ ...ctx.key, messages, tools: json ? undefined : tools, signal: ctx.signal });   // ctx.chat: modelo simulado en pruebas
    let calls = r.toolCalls;
    if (json) {
      const j = extractJson(r.text);
      if (!j || (!j.tool && j.answer == null)) {
        if (++retries > 2) return { text: r.text, messages };
        messages.push({ role: 'assistant', content: r.text }, { role: 'user', content: 'Formato no válido. Responde solo con {"tool": "...", "args": {...}} o {"answer": "..."}.' });
        continue;
      }
      if (j.answer != null) { emit({ type: 'text', agent: agentName, text: String(j.answer), final: depth === 0 }); return { text: String(j.answer), messages }; }
      calls = [{ id: `j${step}`, name: j.tool, args: j.args || {} }];
      messages.push({ role: 'assistant', content: r.text });
    } else {
      if (r.text) emit({ type: 'text', agent: agentName, text: r.text, final: !calls.length && depth === 0 });
      if (!calls.length) return { text: r.text, messages };
      messages.push({ role: 'assistant', content: r.text, toolCalls: calls });
    }
    for (const call of calls) {
      emit({ type: 'tool', agent: agentName, name: call.name, args: call.args });
      let out;
      try {
        if (!agent.tools.includes(call.name)) throw new Error(`El agente ${agentName} no puede usar ${call.name}`);
        out = await runTool(call.name, call.args || {}, sub);
      } catch (e) { out = `Error: ${e.message}`; }
      emit({ type: 'result', agent: agentName, name: call.name, text: String(out).slice(0, 600) });
      if (json) messages.push({ role: 'user', content: `Resultado de ${call.name}: ${out}` });
      else messages.push({ role: 'tool', toolCallId: call.id, name: call.name, content: String(out) });
    }
    if (asked) return { text: '', asked, messages };
  }
  return { text: 'He llegado al máximo de pasos. Dime si continúo.', messages };
}
